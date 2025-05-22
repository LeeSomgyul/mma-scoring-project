package com.mma.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Value("${frontend.origin}")
    private String frontEndOrigin;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        System.out.println("✅ WebConfig 로드됨");
        registry.addMapping("/**")
                .allowedOrigins(frontEndOrigin)
                .allowedMethods("*")
                .allowedHeaders("*")
                .allowCredentials(true);
    }

    @Override
    public void addViewControllers(ViewControllerRegistry registry) {
        registry.addViewController("/").setViewName("forward:/index.html");
        registry.addViewController("/admin").setViewName("forward:/index.html");
        registry.addViewController("/admin/**").setViewName("forward:/index.html");
        registry.addViewController("/judge").setViewName("forward:/index.html");
        registry.addViewController("/judge/**").setViewName("forward:/index.html");
        registry.addViewController("/judge-end").setViewName("forward:/index.html");
        registry.addViewController("/judge-end/**").setViewName("forward:/index.html");
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry
                .addResourceHandler("/**")
                .addResourceLocations("file:./static/");
    }

}
