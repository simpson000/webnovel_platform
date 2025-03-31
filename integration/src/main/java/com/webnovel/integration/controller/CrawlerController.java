package com.webnovel.integration.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

@RestController
@RequestMapping("/api/admin/crawler")
public class CrawlerController {

    private final RestTemplate restTemplate;

    @Value("${crawler.service.url:http://localhost:3001/api}")
    private String crawlerServiceUrl;

    public CrawlerController(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @PostMapping("/trigger/{platform}")
    public ResponseEntity<Object> triggerCrawling(@PathVariable String platform) {
        String url = crawlerServiceUrl + "/crawl/" + platform;
        ResponseEntity<Object> response = restTemplate.postForEntity(url, null, Object.class);
        return response;
    }

    @GetMapping("/status")
    public ResponseEntity<Object> getCrawlerStatus() {
        String url = crawlerServiceUrl + "/status";
        ResponseEntity<Object> response = restTemplate.getForEntity(url, Object.class);
        return response;
    }
}