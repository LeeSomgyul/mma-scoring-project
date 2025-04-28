package com.mma.backend.service;

import com.mma.backend.dto.JudgeQrResponse;
import com.mma.backend.entity.JudgeAccess;
import com.mma.backend.entity.Judges;
import com.mma.backend.entity.Matches;
import com.mma.backend.repository.JudgeAccessRepository;
import com.mma.backend.repository.JudgesRepository;
import com.mma.backend.repository.MatchesRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class JudgeAccessService {

    private final JudgeAccessRepository judgeAccessRepository;
    private final JudgesRepository judgesRepository;
    private final MatchesRepository matchesRepository;
    private String accessCode;


    //✅ 심판 입장용 비밀번호를 서버에 저장
    public String setPassword(String password){
        //🔴 새로운 비밀번호 생성
        String newAccessCode = UUID.randomUUID().toString();
        this.accessCode = newAccessCode;

        //🔴 DB에 저장
        JudgeAccess judgeAccess = JudgeAccess.builder()
                .password(password)
                .accessCode(newAccessCode)
                .isUsed(false)
                .build();

        judgeAccessRepository.save(judgeAccess);

        return this.accessCode;
    }

    //✅ 심판이 입력한 비밀번호가 맞는지 검증
    public boolean verifyPassword(String accessCode ,String password){
        return judgeAccessRepository.findByAccessCode(accessCode)
                .map(config -> config.getPassword().equals(password))
                .orElse(false);
    }

    //✅ 특정 경기(matchId)에 대해 심판 이름 리스트(judgeName)를 받아서 심판별로 deviceId 생성 및 DB도 저장
    public List<JudgeQrResponse> registerJudges(Long matchId, List<String> judgeNames){
        Matches match = matchesRepository.findById(matchId)
                .orElseThrow(() -> new IllegalArgumentException("경기를 찾지 못하였습니다."));

        List<JudgeQrResponse> judgeQrList = new ArrayList<>();

        for (String name : judgeNames) {
            String deviceId = UUID.randomUUID().toString();
            Judges judge = Judges.builder()
                    .name(name)
                    .deviceId(deviceId)
                    .isConnected(false)
                    .match(match)
                    .build();
            judgesRepository.save(judge);

            judgeQrList.add(new JudgeQrResponse(name, deviceId));
        }

        return judgeQrList;
    }
}
