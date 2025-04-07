package com.mma.backend.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "judges")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Judges {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "device_id", unique = true, nullable = false)
    private String devicedId;

    @Column(name = "is_connected")
    private boolean isConnected = false;
}
