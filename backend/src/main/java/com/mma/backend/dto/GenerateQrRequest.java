package com.mma.backend.dto;


import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

@Data
@AllArgsConstructor
public class GenerateQrRequest {
    private Long matchId;
    private String password;
    private List<String> judgeNames;
}
