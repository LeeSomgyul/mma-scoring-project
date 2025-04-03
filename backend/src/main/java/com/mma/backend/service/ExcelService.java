package com.mma.backend.service;

import com.mma.backend.entity.Matches;
import com.mma.backend.repository.MatchesRepository;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ExcelService {

    private final MatchesRepository matchesRepository;

    //✅ 엑셀 파일 받아오는 기능
    public void saveMatchesFromExcel(MultipartFile file, int userSheetNumber) throws Exception {
        int sheetIndex = userSheetNumber - 1;
        Workbook workbook = new XSSFWorkbook(file.getInputStream());

        if(sheetIndex < 0 || sheetIndex >= workbook.getNumberOfSheets()) {
            throw new IllegalArgumentException("존재하지 않는 시트 번호입니다.");
        }

        Sheet sheet = workbook.getSheetAt(sheetIndex);

        //🔴첫 행은 속성 입력
        Row headerRow = sheet.getRow(0);
        if(headerRow == null) {
            throw new IllegalArgumentException("시트 첫 행에 속성을 입력해 주세요.");
        }

        //🔴사용자의 엑셀 헤더와 -> 코드 내부의 필드명과 매핑(엑셀 속성 다르게 입력해도 이것만 수정하면 됨)
        Map<String, String> headerToField = Map.of(
                "경기회차", "matchNumber",
                "경기부문", "division",
                "라운드수", "roundCount",
                "레드선수", "redName",
                "레드소속", "redGym",
                "블루선수", "blueName",
                "블루소속", "blueGym"
        );

        //🔴엑셀의 열 속성 순서가 바뀌어도 데이터를 가져올 수 있도록 하는 기능, <속성명, 인덱스> 저장
        Map<String, Integer> columnIndex = new HashMap<>();
        for(int j = 0; j < headerRow.getLastCellNum(); j++) {
            String rawHeader = headerRow.getCell(j).getStringCellValue().trim();
            String normalized = rawHeader.replaceAll("\\s+", "").toLowerCase();

            if(headerToField.containsKey(normalized)) {
                String fieldName = headerToField.get(normalized);
                columnIndex.put(fieldName, j);
            }
        }

        //🔴엑셀 행 한줄씩 돌기
        for (int i = 1; i <= sheet.getLastRowNum(); i++) {
            Row row = sheet.getRow(i);
            if (row == null) continue;//☑️엑셀의 비어있는 행은 건너뛰기

            //☑️DB에 저장
            try{
                Matches matches = Matches.builder()
                        .matchNumber(getIntCell(row.getCell(columnIndex.get("matchNumber")),"경기회차", i))
                        .division(getStringCell(row.getCell(columnIndex.get("division")),"경기부문", i))
                        .roundCount(getIntCell(row.getCell(columnIndex.get("roundCount")),"라운드수", i))
                        .redName(getStringCell(row.getCell(columnIndex.get("redName")),"레드선수", i))
                        .redGym(getStringCell(row.getCell(columnIndex.get("redGym")), "레드소속", i))
                        .blueName(getStringCell(row.getCell(columnIndex.get("blueName")), "블루선수", i))
                        .blueGym(getStringCell(row.getCell(columnIndex.get("blueGym")), "블루소속", i))
                        .build();

                matchesRepository.save(matches);
            }catch(Exception e){
                throw new IllegalArgumentException("❌ " + (i + 1) + "행 처리 중 오류: " + e.getMessage());
            }
            }
        workbook.close();
    }

    //✅ 엑셀에서 숫자가 들어갈 자리에 문자가 들어있는 경우 막기
    private int getIntCell(Cell cell, String columnName, int rowIndex) {
        if(cell == null) throw new IllegalArgumentException(rowIndex + 1 + "행 '" + columnName + "'은 비어있으면 안됩니다.");
        try{
            if(cell.getCellType() == CellType.NUMERIC) {
                return (int) cell.getNumericCellValue();
            }else if(cell.getCellType() == CellType.STRING) {
                return Integer.parseInt(cell.getStringCellValue().trim());
            }else{
                throw new IllegalArgumentException("셀 타입을 확인해 주세요.");
            }
        }catch (Exception e){
            throw  new IllegalArgumentException(rowIndex + 1 +"행 '" + columnName + "' 셀을 숫자로 변환 실패", e);
        }
    }

    //✅ 엑셀에서 문자가 들어갈 자리에 다른게 들어간 경우
    private String getStringCell(Cell cell, String columnName, int rowIndex) {
        if(cell == null) return "";
        try{
            switch (cell.getCellType()){
                case STRING:
                    return cell.getStringCellValue().trim();
                case NUMERIC:
                    return String.valueOf((int) cell.getNumericCellValue());
                case BOOLEAN:
                    return String.valueOf(cell.getBooleanCellValue());
                case FORMULA:
                    return cell.getCellFormula();
                case ERROR:
                    throw new IllegalArgumentException(rowIndex + 1 + "행 '" + columnName + "' 셀에 오류가 있습니다.");
                default:
                    return "";
            }
        }catch (Exception e){
            throw new IllegalArgumentException(rowIndex + 1 + "행 '" + columnName + "' 셀 읽기 실패 (문자형)");
        }
    }
}

