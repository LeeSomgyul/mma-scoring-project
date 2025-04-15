package com.mma.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class JudgeScoreResponse {
    private String judgeName;
    private int red;
    private int blue;
    private boolean submitted;
}
