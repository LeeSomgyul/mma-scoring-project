package com.mma.backend.controller;

import com.mma.backend.entity.Matches;
import com.mma.backend.repository.MatchesRepository;
import com.mma.backend.service.ExcelService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/matches")
public class MatchesController {

    private final ExcelService excelService;
    private final MatchesRepository matchesRepository;

    //✅ 엑셀 파일 불러오기(경기 목록 조회)
    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getAllMatches(){
        List<Matches> matches = matchesRepository.findAll();
        List<Map<String, Object>> matchList = matches.stream().map(match -> {
            Map<String, Object> matchInfo = new HashMap<>();
            matchInfo.put("id", match.getId());
            matchInfo.put("matchNumber", match.getMatchNumber());
            matchInfo.put("division", match.getDivision());
            matchInfo.put("roundCount", match.getRoundCount());
            matchInfo.put("redName", match.getRedName());
            matchInfo.put("blueName", match.getBlueName());
            matchInfo.put("redGym", match.getRedGym());
            matchInfo.put("blueGym", match.getBlueGym());

            List<Map<String, Object>> rounds = match.getRounds().stream()
                    .map(r -> {
                        Map<String, Object> round = new HashMap<>();
                        round.put("id", r.getId());
                        round.put("roundNumber", r.getRoundNumber());
                        return round;
                    })
                    .toList();
                    matchInfo.put("rounds", rounds);
                    return matchInfo;
        }).toList();
        return ResponseEntity.ok(matchList);
    }

    //✅ 엑셀 파일 업로드
    @PostMapping("/upload")
    public ResponseEntity<List<String>> uploadExcel(
            @RequestParam("file") MultipartFile file,
            @RequestParam("sheet") int userSheetNumber) {

        System.out.println("📥 업로드 받은 파일: " + file.getOriginalFilename() + ", sheet: " + userSheetNumber);

        try {
            // ✔️ 서비스에서는 List<String>만 리턴
            List<String> resultLog = excelService.saveMatchesFromExcel(file, userSheetNumber);

            // ✔️ 여기서만 응답 상태코드 판단
            boolean hasError = resultLog.stream().anyMatch(line -> line.contains("❌") || line.contains("오류"));

            if (hasError) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(resultLog);
            } else {
                return ResponseEntity.ok(resultLog);
            }

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(List.of("❌ 엑셀 업로드 실패: " + e.getMessage()));
        }
    }
}
