# Video Call Window Documentation

## Overview

The video call window system in Rocket.Chat Electron has two main parts:

1. **Window Management** - How the video call window is created and managed
2. **Screen Sharing** - How screen sharing works within the video call

## Documentation Files

### 📊 [Window Management Flow](./video-call-window-management.md)
**What it covers:** How Rocket.Chat opens a video call window when you click a video call button.

This document explains the complete process from when you click "Join Call" to when you see a working video call interface. It shows how the app creates a separate window for your video call, sets it up safely, handles any problems that might occur, and makes sure everything works reliably even on slower computers.

**You'll learn about:**
- How the app validates video call URLs for security
- Why video calls open in separate windows  
- How the app handles errors and tries to fix them automatically
- The retry system that makes video calls work reliably
- How multiple attempts ensure success even with slow internet
- What happens when you close a video call window

**Perfect for understanding:** Why video calls sometimes take a moment to open, how the app recovers from problems, and what's happening behind the scenes when you start a video call.

### 🖥️ [Screen Sharing Flow](./video-call-screen-sharing.md) 
**What it covers:** How screen sharing works when you're already in a video call.

This document explains what happens when you click the screen share button during a video call. It shows how the app finds all your windows and screens, how it makes the selection process fast with smart caching, and how it ensures what you choose actually works before sharing it with others.

**You'll learn about:**
- How the app discovers all your open windows and screens
- Why screen sharing feels instant the second time you use it
- How the app organizes your options into easy-to-use tabs
- The smart caching system that makes everything fast
- How the app handles closed windows and disconnected screens
- What happens to memory and cache when you end calls

**Perfect for understanding:** Why screen sharing opens quickly, how the preview thumbnails are generated, what the app does when windows disappear, and how it manages computer resources efficiently.

## How They Work Together

### The Complete User Journey

1. **📊 Window Management** → You click a video call button, and the app creates a working video call window
2. **🖥️ Screen Sharing** → While in the call, you click screen share and select what to share

### Real-World Example

**Starting a call:**
- You click "Join Video Call" in a Rocket.Chat message
- Window Management Flow takes over
- A new window opens and loads the video call interface
- You see other participants and can talk/video chat

**Sharing your screen:**
- You click the screen share button in the video call
- Screen Sharing Flow takes over  
- A small window shows all your options with preview images
- You click on a window or screen to share it
- Others in the call immediately see what you're sharing

Both systems work together seamlessly to give you a complete video calling experience that's fast, reliable, and easy to use. 