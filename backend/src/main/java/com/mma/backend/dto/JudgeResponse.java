//🔥 심판 입장 응답용
package com.mma.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class JudgeResponse {
    private String name;
    private boolean isConnected;
}
