package com.mma.backend.service;

import com.mma.backend.entity.Judges;
import com.mma.backend.entity.MatchProgress;
import com.mma.backend.repository.JudgesRepository;
import com.mma.backend.repository.MatchProgressRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class JudgesService {

    private final JudgesRepository judgesRepository;
    private final MatchProgressRepository matchProgressRepository;

    //✅ 심판 입장 시 정보 등록하는 기능
    public Judges registerJudge(String name, String deviceId) {
        Optional<Judges> existingJudge = judgesRepository.findByDevicedId(deviceId);

        Judges judge;
        if(existingJudge.isPresent()) {
            judge = existingJudge.get();
            judge.setConnected(true);
        }else{
            judge = Judges.builder()
                    .name(name)
                    .devicedId(deviceId)
                    .isConnected(true)
                    .build();
        }

        return judgesRepository.save(judge);
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

    //✅ 심판용 UUID 여러 개 생성
    public List<String> generateJudges(int count){
        List<String> generatedIds = new ArrayList<>();

        for(int i = 0; i < count; i++){
            String uuid = UUID.randomUUID().toString();

            Judges judges = Judges.builder()
                    .devicedId(uuid)
                    .name("")//🔥🔥🔥나중에 입장 시 입력하도록
                    .isConnected(false)
                    .build();

            judgesRepository.save(judges);
            generatedIds.add(uuid);
        }

        return generatedIds;
    }

    //✅ 심판 인원을 초과해서 입장할 시 막는 기능
    public boolean isJudgeLimitReached(){
        MatchProgress progress = matchProgressRepository.findCurrentProgress()
                .orElseThrow(() -> new IllegalArgumentException("현재 경기 진행 정보가 없습니다."));

        int maxJudgeCount = progress.getJudgeCount();
        int currentJudgeCount = judgesRepository.countByIsConnectedTrue();

        return currentJudgeCount >= maxJudgeCount;
    }
}
