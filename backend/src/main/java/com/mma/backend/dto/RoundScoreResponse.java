package com.mma.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

@Data
@AllArgsConstructor
public class RoundScoreResponse {
    private Long roundId;
    private int roundNumber;
    private List<JudgeScoreResponse> judges;
}
