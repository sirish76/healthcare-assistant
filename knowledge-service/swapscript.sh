# 1. Add swap
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# 2. Install ffmpeg (required by Whisper)
sudo apt install ffmpeg -y   # Ubuntu
# OR if Amazon Linux:
# sudo yum install ffmpeg -y

# 3. Install new Python packages
cd ~/app/knowledge-service
pip install openai-whisper yt-dlp

# 4. Verify
free -h   # should show 2G swap now
ffmpeg -version | head -1
python3 -c "import whisper; print('Whisper OK')"
yt-dlp --version
