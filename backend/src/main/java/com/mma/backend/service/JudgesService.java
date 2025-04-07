package com.mma.backend.service;

import com.mma.backend.entity.Judges;
import com.mma.backend.repository.JudgesRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class JudgesService {

    private final JudgesRepository judgesRepository;

    //✅ 심판 입장 시 정보 등록하는 기능
    public Judges registerJudge(String name, String deviceId) {
        return judgesRepository.save(Judges.builder()
                .name(name)
                .devicedId(deviceId)
                .isConnected(true)
                .build());
    }

    //✅ 심판의 연결 상태 업데이트(연결 끊길수도 있으니까 여부 확인)
    public void updateConnectionStatus(Long id, boolean isConnected) {
        Judges judge = judgesRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("심판과의 연결이 끊겼습니다."));
        judge.setConnected(isConnected);
        judgesRepository.save(judge);
    }

    //✅ 본부석에서 전체 심판 목록 확인 기능(연결 유무 상관없이)
    public List<Judges> getAllJudges() {
        return judgesRepository.findAll();
    }

}
