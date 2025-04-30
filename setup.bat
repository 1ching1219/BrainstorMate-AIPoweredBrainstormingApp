@echo off

REM 建立專案資料夾
mkdir video_app
cd video_app

REM 建立 Python 虛擬環境
python -m venv venv
call venv\Scripts\activate

REM 安裝 Django 及相關套件
pip install django djangorestframework django-cors-headers channels daphne

REM 建立 Django 專案與應用
django-admin startproject backend .
django-admin startapp video_api

REM 建立 React 前端
npx create-react-app frontend
cd frontend
npm install axios socket.io-client simple-peer styled-components

pause
