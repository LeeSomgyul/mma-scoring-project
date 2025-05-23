package com.mma.backend.entity;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "matches")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Matches {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "match_number", nullable = false)
    private int matchNumber;

    @Column(name = "division", nullable = false)
    private String division;

    @Column(name = "round_count", nullable = false)
    private int roundCount;

    @Column(name = "red_name", nullable = false)
    private String redName;

    @Column(name = "blue_name", nullable = false)
    private String blueName;

    @Column(name = "red_gym")
    private String redGym;

    @Column(name = "blue_gym")
    private String blueGym;

    @Column(name = "created_at")
    @CreationTimestamp
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "match", cascade = CascadeType.ALL, fetch = FetchType.LAZY, orphanRemoval = true)
    @JsonManagedReference
    private List<Rounds> rounds = new ArrayList<>();
}
