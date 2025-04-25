package com.mma.backend.config;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Value("${frontend.origin}")
    private String frontEndOrigin;

    //🔥테스트 후 삭제 가능
    @PostConstruct
    public void printOrigin() {
        System.out.println("✅ 현재 origin 설정: " + frontEndOrigin);
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        System.out.println("✅ WebConfig 로드됨");
        registry.addMapping("/**")
                .allowedOrigins(frontEndOrigin)
                .allowedMethods("*")
                .allowedHeaders("*")
                .allowCredentials(true);
    }
}
