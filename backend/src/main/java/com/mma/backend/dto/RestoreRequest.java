package com.mma.backend.dto;


import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class RestoreRequest {
    private String deviceId;
    private Long matchId;
}
