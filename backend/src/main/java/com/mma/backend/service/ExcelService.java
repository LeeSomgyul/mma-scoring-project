package com.mma.backend.service;

import com.mma.backend.entity.Matches;
import com.mma.backend.repository.MatchesRepository;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.*;

@Service
@RequiredArgsConstructor
public class ExcelService {

    private final MatchesService matchesService;
    private final MatchesRepository matchesRepository;

    //✅ 엑셀 파일 받아오는 기능
    public List<String> saveMatchesFromExcel(MultipartFile file, int userSheetNumber) throws Exception {
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

        //🔴관리자에게 엑셀 업로드 결과 보낼 배열
        List<String> resultLog = new ArrayList<>();
        Set<Integer> seenMatchNumbers = new HashSet<>();
        boolean hasError = false;

        //🔴엑셀 행 한줄씩 돌기
        for (int i = 1; i <= sheet.getLastRowNum(); i++) {
            Row row = sheet.getRow(i);
            if (row == null || isRowEmpty(row)) continue;//☑️엑셀의 비어있는 행은 건너뛰기

            //☑️DB에 저장
            try{
                int matchNumber = getIntCell(row.getCell(columnIndex.get("matchNumber")),"경기회차", i, columnIndex.get("matchNumber"));
                
                //☑️ matchNumber(경기회차) 중복 체크
                if (!seenMatchNumbers.add(matchNumber)) {
                    throw new IllegalArgumentException("[" + (i + 1) + "행 " + (columnIndex.get("matchNumber") + 1) + "열] '" + matchNumber + "'는 엑셀 내에서 중복된 경기회차입니다.");
                }
                
                //☑️엑셀 파일 수정으로 다시 업로드 하는경우: 기존 데이터 있는지 확인 후 없으면 새 객체 생성
                Matches matches = matchesRepository.findByMatchNumber(matchNumber)
                        .orElseGet(Matches::new);

                //☑️ 새 엑셀 파일이면 업로드, 수정된거면 업데이트
                matches.setMatchNumber(matchNumber);
                matches.setDivision(getStringCell(row.getCell(columnIndex.get("division")), "경기부문", i, columnIndex.get("division")));
                matches.setRoundCount(getIntCell(row.getCell(columnIndex.get("roundCount")), "라운드수", i, columnIndex.get("roundCount")));
                matches.setRedName(getStringCell(row.getCell(columnIndex.get("redName")), "레드선수", i, columnIndex.get("redName")));
                matches.setRedGym(getStringCell(row.getCell(columnIndex.get("redGym")), "레드소속", i, columnIndex.get("redGym")));
                matches.setBlueName(getStringCell(row.getCell(columnIndex.get("blueName")), "블루선수", i, columnIndex.get("blueName")));
                matches.setBlueGym(getStringCell(row.getCell(columnIndex.get("blueGym")), "블루소속", i, columnIndex.get("blueGym")));

                matchesService.saveMatch(matches);
                resultLog.add((i + 1) + "행: ✅ 업로드 성공");
            }catch(Exception e){
                hasError = true;
                resultLog.add((i + 1) + "행: ❌ 실패 - " + e.getMessage());
            }
        }
        workbook.close();

        //☑️ 엑셀 행에 잘못된 입력이 있을 경우
        if(hasError){
            resultLog.add("오류가 발생하여 업로드가 중단되었습니다. 모든 오류를 수정한 후 다시 시도해 주세요.");
        }else{
            resultLog.add("✅ 전체 " + seenMatchNumbers.size() + "개 업로드 완료!");
        }

        return resultLog;
    }

    //✅ 엑셀에서 숫자가 들어갈 자리에 문자가 들어있는 경우 막기
    private int getIntCell(Cell cell, String columnName, int rowIndex, int columnIndex) {
        if(cell == null) throw new IllegalArgumentException("[" + (rowIndex + 1) + "행 " + (columnIndex + 1) + "열] '" + columnName + "' 셀은 비어있으면 안됩니다.");
        try{
            if(cell.getCellType() == CellType.NUMERIC) {
                return (int) cell.getNumericCellValue();
            }else if(cell.getCellType() == CellType.STRING) {
                return Integer.parseInt(cell.getStringCellValue().trim());
            }else{
                throw new IllegalArgumentException("[" + (rowIndex + 1) + "행 " + (columnIndex + 1) + "열] '" + columnName + "' 셀은 숫자를 입력해 주세요.");
            }
        }catch (Exception e){
            throw  new IllegalArgumentException("[" + (rowIndex + 1) + "행 " + (columnIndex + 1) + "열] '" + columnName + "' 셀은 숫자를 입력해 주세요.", e);
        }
    }

    //✅ 엑셀에서 문자가 들어갈 자리에 다른게 들어간 경우
    private String getStringCell(Cell cell, String columnName, int rowIndex, int columnIndex) {
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
                    throw new IllegalArgumentException("[" + (rowIndex + 1) + "행 " + (columnIndex + 1) + "열] '" + columnName + "' 셀에 오류가 있습니다.");
                default:
                    return "";
            }
        }catch (Exception e){
            throw new IllegalArgumentException("[" + (rowIndex + 1) + "행 " + (columnIndex + 1) + "열] '" + columnName + "' 셀 읽기 실패", e);
        }
    }

    //✅ 비어있는 행은 건너뛰는 함수
    private boolean isRowEmpty(Row row) {
        for(int c = 0; c < row.getLastCellNum(); c++) {
            Cell cell = row.getCell(c);
            if(cell != null && cell.getCellType() != CellType.BLANK && !cell.toString().trim().isEmpty()) {
                return false;
            }
        }
        return true;
    }
}

