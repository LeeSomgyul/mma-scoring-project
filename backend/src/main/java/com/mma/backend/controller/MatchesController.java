package com.mma.backend.controller;

import com.mma.backend.entity.Matches;
import com.mma.backend.service.ExcelService;
import com.mma.backend.service.MatchesService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/matches")
public class MatchesController {

    private final ExcelService excelService;
    private final MatchesService matchesService;

    //✅ 엑셀 파일 업로드
    @PostMapping("/upload")
    public ResponseEntity<List<String>> uploadExcel(
            @RequestParam("file") MultipartFile file,
            @RequestParam("sheet") int userSheetNumber){
        try{
            List<String> resultLog = excelService.saveMatchesFromExcel(file, userSheetNumber);
            return ResponseEntity.ok(resultLog);
        }catch (Exception e){
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(List.of("❌ 엑셀 업로드 실패: " + e.getMessage()));
        }
    }

    //✅ 엑셀 파일 불러오기(경기 목록 조회)
    @GetMapping
    public List<Matches> getAllMatches(){
        return matchesService.getAllMatches();
    }
}
