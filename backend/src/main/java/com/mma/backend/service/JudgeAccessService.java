package com.mma.backend.service;

import com.mma.backend.entity.JudgeAccess;
import com.mma.backend.repository.JudgeAccessRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class JudgeAccessService {

    private final JudgeAccessRepository judgeAccessRepository;

    //✅ 심판 인원수 대로 uuid(인증 코드) 발급
    public String createAccessCode(String password) {
        String uuid = UUID.randomUUID().toString();

        JudgeAccess judgeAccess = JudgeAccess.builder()
                .password(password)
                .accessCode(uuid)
                .isUsed(false)
                .build();

        judgeAccessRepository.save(judgeAccess);
        return uuid;
    }

    //✅ 심판 경기 입장용 비밀번호 설정
    public String setPassword(String password){
        String accessCode = UUID.randomUUID().toString();
        JudgeAccess config = judgeAccessRepository.findAll().stream().findFirst()
                .orElse(JudgeAccess.builder().build());

        config.setPassword(password);
        config.setAccessCode(accessCode);

        judgeAccessRepository.save(config);
        return accessCode;
    }

    //✅ 심판이 입력한 비밀번호가 맞는지 검증
    public boolean verifyPassword(String accessCode ,String password){
        return judgeAccessRepository.findByAccessCode(accessCode)
                .map(config -> config.getPassword().equals(password))
                .orElse(false);
    }
}
