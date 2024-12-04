# Design Document
This is the design document for our Dat515 final project. This document will give a brief understanding of our:
* Overview
* Architecture
* Technologies
* Deployment

## Overview
Our cloud application is a simplified twitter. The application contains a login page and a registration page. When the user is logged in, they can write tweets that their friends can interact with. The user can also get a quick overview of their friends and see what they have posted. It is also possible for friends to send messages to each other.

## Architecture
The applications architecture is 
```mermaid
graph TD
    Users[
        UserID CHAR(36) PRIMARY KEY DEFAULT (UUID()),
        Username VARCHAR(255) NOT NULL UNIQUE,
        UserPWD VARCHAR(255) NOT NULL,
        FirstName VARCHAR(255) NOT NULL,
        LastName VARCHAR(255) NOT NULL,
        ProfilePicURL VARCHAR(255),
        FriendID CHAR(36) 
    ]

    Tweets[
        UserID
        TweetsID
        TimeStamp
        Likes
        CommentID
    ]
    
    Comment[
        CommentID
        TweetID
        UserID
        Comment
    ]

    Friend[
        FriendID
    ]
    Messages[
        RecieverID
        SenderID
    ]

    Users --- Tweets
    Users --- Friend
    Tweets --- Comment
    Friend --- Users
    Users ---Messages
    Messages --- Users

```
* A user has multiple tweets where a tweet has one user.
* A tweet has multiple likes and comments, but one comment only has one tweet.
* A user has multiple friends, where friendID is a userID.
* A message has a senderID which is a userID and a ReceiverID which is a UserID.

## Technologies
1. Frontend - Node.js with Vue and vite
2. Backend - Node.js with express
3. Database - MySQL

The instance utilizes a ubuntu 24.04 server with a Xlarge image. 

## Deployment
The deployment of the application is a kubernetes service with port 32000

