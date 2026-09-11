---
title: "Lessons from Vibe Coding"
date: 2026-09-11
description: "What a failed homework-notebook prototype taught me about engineering, costs, and business beyond AI-assisted coding."
tags: ["Vibe Coding", "AI coding", "product development", "retrospective"]
categories: ["Work"]
draft: false
translationKey: "vibe-coding-notes"
translationSource: "ai-reviewed"
---

## The short version

After two or three weeks of practicing Vibe Coding, I reached a broad conclusion: large language models have dramatically lowered the barrier to programming. Anyone with basic computer literacy can now use AI to write programs and implement useful features.

However, those features often run only on a local computer or remain personal tools. Turning them into a service that runs on a server, serves customers, and can be continuously improved requires much stronger engineering thinking.

If the goal is to build independently with AI and make money through an OPC (One Person Company) model, technical implementation is only one part of the problem. The overall business model, cost structure, user needs, and competition also need to be considered.

This is a reflection on a homework-notebook mini-program that I recently tried to build.

## Background

My undergraduate degree is in Electronic Information Science and Technology, and I later earned an MBA. After university, I studied Java development for roughly six months to a year through a training program. At the time, the mainstream approach was the classic MVC architecture implemented with SSH: Spring, Struts, and Hibernate.

Although I had not independently written and launched a complete product in my previous work, I had worked in IT for many years. I understood databases, middleware, frontend, and backend systems, and had led product, engineering, and operations teams through a product build from zero to one.

So I was not starting without technical context, but I also understood that independently completing a product is different from understanding technical concepts or managing an engineering team.

## Why I started

After returning to Chengdu from Japan, I began thinking about the next stage of my career. In my forties, retirement was not a realistic option, either financially or in terms of personal value. I needed to keep working and explore new possibilities.

I wanted to build a homework notebook that could help users collect their mistakes, identify weak areas through analysis, and improve learning over time.

## From an idea to a prototype

Once I had enough uninterrupted time, I started building. My initial idea was a standalone app. After discussing the options with AI, I chose a WeChat mini-program because I assumed it would be lighter to build and release.

In practice, “lighter” was only true on the surface. The runtime environment, API limits, and platform rules forced me to redesign many parts that would have been straightforward in a normal web or mobile app.

## Problem one: image recognition and timeouts

The basic workflow was:

1. Take a photo of a wrong answer;
2. Use AI to recognize the question and the solution process;
3. Analyze the mistake and identify weak areas;
4. Generate a targeted notebook from those weak areas;
5. Push review materials periodically.

The first major problem appeared in image recognition.

I initially used DeepSeek. Although the model has Vision capabilities, it was not specifically optimized for homework correction or error analysis. Recognition speed and quality were inconsistent: sometimes fast, sometimes slow, and sometimes unsuccessful.

WeChat mini-program requests have a default timeout of 15 seconds. If model processing takes longer, the mini-program treats the request as failed.

That was my first real engineering lesson: the mini-program should not wait synchronously for the model. The recognition process needed to become an asynchronous task.

## Problem two: asynchronous architecture and cloud services

The AI assistant suggested an asynchronous flow: upload the image first, create a recognition task and return a task ID, call the model in a background service, and let the mini-program poll for or receive the result.

That required Serverless functions or another backend service.

I initially deployed the mini-program backend on WeChat Cloud. It did not provide all the services I needed, so I added Tencent Cloud services for asynchronous recognition.

After implementing image upload and asynchronous processing, another issue surfaced: WeChat Cloud and the Tencent Cloud VPC were not directly connected. The mini-program had to reach the Tencent Cloud service over the public internet, which required a domain name and an HTTPS certificate.

Even after obtaining both, HTTPS access still did not work. I eventually discovered that the domain required Chinese mainland ICP filing. The filing took nearly a week and could not be expedited. It also required the domain to be associated with a Tencent Cloud service.

I ended up purchasing a Tencent Cloud CVM and spending considerable effort migrating the service from WeChat Cloud to Tencent Cloud. Only then could the service be accessed normally.

## Problem three: model choice and competition

Once the infrastructure and networking problems were solved, I expected the core issue to be behind me. Testing showed otherwise: image recognition quality was still not good enough.

Further research showed that the problem was not only the code or deployment. It was also the model itself. There are models specifically optimized for homework correction and error analysis, with much better performance on question recognition, handwriting, and educational workflows. They also cost extra.

At the same time, mature homework-notebook products already covered most of the functionality I wanted to build.

Considering development cost, model usage cost, product maturity, and competition, I decided to stop developing my own mini-program and use an existing mature product instead.

That does not make the development effort worthless. It clarified an important distinction: whether an idea can be built is different from whether it is worth turning into an independent product.

## What I still need to improve

Looking back, I need to strengthen several areas:

- Architecture: account for platform limits, network boundaries, and asynchronous processing earlier;
- Model selection: evaluate scenario-specific optimization, not just whether a model has a capability;
- Deployment and operations: local success does not imply production stability;
- Cost control: tokens, cloud servers, domains, certificates, and model services create ongoing costs;
- Market research: check for mature alternatives before investing heavily in implementation;
- Business model: profitability through an OPC model also requires validating demand, acquisition, pricing, and long-term operations.

Vibe Coding can help one person turn an idea into a prototype quickly. Moving from prototype to product still requires combined engineering, product, and business capabilities.

## A final note: tools should fit the workflow

After trying Codex and TUI-based tools, I eventually returned to VS Code. Not because the newer tools were bad, but because VS Code matched the habits I formed when I first learned development and helped me maintain a steady rhythm.

The tool matters, but finding a sustainable way of working matters more. For an independent builder, the ability to keep using, thinking, and iterating is often more valuable than chasing the newest tool.
