package com.mma.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class JudgeQrResponse {
    private String name;
    private String deviceId;
}
