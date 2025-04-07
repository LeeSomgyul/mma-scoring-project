package com.mma.backend.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "rounds")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Rounds {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "match_id")
    private Matches matches;

    @Column(name = "round_number", nullable = false)
    private int roundNumber;

    @Column(name = "is_finished", nullable = false)
    private boolean isFinished = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "winner_corner")
    private WinnerCorner winnerCorner;

    public enum WinnerCorner {
        RED, BLUE, DRAW
    }
}
