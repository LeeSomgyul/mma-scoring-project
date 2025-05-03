//🔥 라운드 점수 상태 전송용
package com.mma.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class JudgeScoreResponse {
    private String judgeId;
    private String judgeName;
    private Integer red;
    private Integer blue;
    private Boolean submitted;
    private Boolean isConnected;
}
