document.addEventListener('DOMContentLoaded', () => {
  // Navigation / Tabs
  const navItems = document.querySelectorAll('.nav-item');
  const tabPanes = document.querySelectorAll('.tab-pane');
  
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const targetTab = item.getAttribute('data-tab');
      
      navItems.forEach(i => i.classList.remove('active'));
      tabPanes.forEach(t => t.classList.remove('active'));
      
      item.classList.add('active');
      document.getElementById(`tab-${targetTab}`).classList.add('active');
      
      if (targetTab === 'archive') {
        loadVideoArchive();
      }
      if (targetTab === 'profile') {
        loadChannelProfile();
      }
    });
  });

  // Global State
  let generatedAudioPath = '';
  let generatedImagePath = '';
  let compiledVideoId = '';
  let systemStatus = {};

  // DOM Elements
  const statusIndicator = document.querySelector('.status-indicator');
  const navChannelName = document.getElementById('nav-channel-name');
  
  // Settings Tab
  const settingsModeVal = document.getElementById('settings-mode-val');
  const settingsOauthVal = document.getElementById('settings-oauth-val');
  const settingsChannelVal = document.getElementById('settings-channel-val');
  const btnConnectOauth = document.getElementById('btn-connect-oauth');
  const btnDisconnectOauth = document.getElementById('btn-disconnect-oauth');

  // Load API status
  async function loadStatus() {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      systemStatus = data;
      
      // Update UI elements
      navChannelName.textContent = data.channel_name;
      settingsChannelVal.textContent = data.channel_name;
      
      if (data.simulation_mode) {
        statusIndicator.className = 'status-indicator simulated';
        settingsModeVal.className = 'val badge-sim';
        settingsModeVal.textContent = 'Simulation Mode (Active)';
      } else {
        statusIndicator.className = 'status-indicator connected';
        settingsModeVal.className = 'val badge-public';
        settingsModeVal.textContent = 'Live YouTube API Mode';
      }
      
      if (data.connected) {
        settingsOauthVal.className = 'val badge-public';
        settingsOauthVal.textContent = 'Authenticated & Active';
        btnConnectOauth.classList.add('hidden');
        btnDisconnectOauth.classList.remove('hidden');
      } else {
        settingsOauthVal.className = 'val badge-private';
        settingsOauthVal.textContent = 'Not Connected';
        btnConnectOauth.classList.remove('hidden');
        btnDisconnectOauth.classList.add('hidden');
      }
    } catch (err) {
      console.error('Error fetching API status:', err);
    }
  }
  
  loadStatus();

  // Settings: Connect YouTube Account
  btnConnectOauth.addEventListener('click', async () => {
    try {
      const res = await fetch('/api/auth-url');
      const data = await res.json();
      if (data.url) {
        // Open Google OAuth authentication window
        window.open(data.url, 'GoogleAuth', 'width=600,height=600');
        
        // Poll for state change
        const checkInterval = setInterval(async () => {
          await loadStatus();
          if (systemStatus.connected) {
            clearInterval(checkInterval);
          }
        }, 2000);
      } else {
        alert('Could not retrieve Auth URL. Make sure Client ID / Secret are set in .env');
      }
    } catch (err) {
      alert('Error fetching OAuth URL: ' + err.message);
    }
  });

  // Settings: Disconnect YouTube
  btnDisconnectOauth.addEventListener('click', async () => {
    if (confirm('Disconnect YouTube account? System will revert to Simulation Mode.')) {
      try {
        await fetch('/api/disconnect', { method: 'POST' });
        loadStatus();
      } catch (err) {
        console.error('Disconnect failed:', err);
      }
    }
  });

  // Studio: Music Generation
  const synthForm = document.getElementById('synth-form');
  const btnGenerateAudio = document.getElementById('btn-generate-audio');
  const audioPlayer = document.getElementById('audio-player');
  const audioPreviewContainer = document.getElementById('audio-preview-container');
  const checkAudio = document.getElementById('check-audio');

  synthForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    btnGenerateAudio.disabled = true;
    btnGenerateAudio.textContent = 'Synthesizing Audio...';
    
    const mood = document.getElementById('synth-mood').value;
    const bpm = document.getElementById('synth-bpm').value;
    const duration = document.getElementById('synth-duration').value;
    
    const gains = {
      pad: parseFloat(document.getElementById('mix-pad').value) / 100,
      melody: parseFloat(document.getElementById('mix-mel').value) / 100,
      bass: parseFloat(document.getElementById('mix-bass').value) / 100,
      drum: parseFloat(document.getElementById('mix-drum').value) / 100,
      ambiance: parseFloat(document.getElementById('mix-amb').value) / 100
    };
    
    try {
      const res = await fetch('/api/generate-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mood, bpm, duration, gains })
      });
      const data = await res.json();
      
      if (data.success) {
        generatedAudioPath = data.filePath;
        audioPlayer.src = data.filePath;
        audioPreviewContainer.classList.remove('hidden');
        checkAudio.classList.add('done');
        checkAudio.innerHTML = `<span class="bullet">✓</span> Wave Soundfile Generated (${duration}s)`;
        
        // Auto-generate optimization description based on mood/settings
        requestMetadataGen(mood + " lofi lofi sleep");
        
        checkCompileStatus();
      } else {
        alert('Sound synthesis failed: ' + data.error);
      }
    } catch (err) {
      alert('Error generating audio: ' + err.message);
    } finally {
      btnGenerateAudio.disabled = false;
      btnGenerateAudio.textContent = 'Generate Lo-Fi Wav';
    }
  });

  // Suno AI / Custom Audio file import
  const btnImportAudio = document.getElementById('btn-import-audio');
  const customAudioFile = document.getElementById('custom-audio-file');
  const customAudioStatus = document.getElementById('custom-audio-status');

  btnImportAudio.addEventListener('click', async () => {
    const file = customAudioFile.files[0];
    if (!file) {
      alert('Please select an audio file to import first.');
      return;
    }
    
    btnImportAudio.disabled = true;
    btnImportAudio.textContent = 'Importing...';
    customAudioStatus.textContent = 'Uploading audio track to server...';
    
    const formData = new FormData();
    formData.append('audio', file);
    
    try {
      const res = await fetch('/api/upload-audio', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      
      if (data.success) {
        generatedAudioPath = data.filePath;
        audioPlayer.src = data.filePath;
        audioPreviewContainer.classList.remove('hidden');
        checkAudio.classList.add('done');
        checkAudio.innerHTML = `<span class="bullet">✓</span> Custom Audio Imported: ${file.name}`;
        customAudioStatus.textContent = 'Custom track successfully imported!';
        
        requestMetadataGen('custom suno ai chill track');
        checkCompileStatus();
      } else {
        alert('Failed to upload custom audio: ' + data.error);
        customAudioStatus.textContent = 'Upload failed.';
      }
    } catch (err) {
      alert('Error uploading audio: ' + err.message);
      customAudioStatus.textContent = 'Connection error.';
    } finally {
      btnImportAudio.disabled = false;
      btnImportAudio.textContent = 'Import Track';
    }
  });

  // Studio: Image Generation
  const imageForm = document.getElementById('image-form');
  const btnGenerateImage = document.getElementById('btn-generate-image');
  const imagePreview = document.getElementById('image-preview');
  const imagePreviewContainer = document.getElementById('image-preview-container');
  const checkImage = document.getElementById('check-image');
  const btnEvolvePrompt = document.getElementById('btn-evolve-prompt');
  const imgPromptTextarea = document.getElementById('img-prompt');

  btnEvolvePrompt.addEventListener('click', async () => {
    btnEvolvePrompt.disabled = true;
    btnEvolvePrompt.textContent = '🧬 Evolving...';
    try {
      const res = await fetch('/api/evolve-prompt');
      const data = await res.json();
      imgPromptTextarea.value = data.prompt;
    } catch (err) {
      console.error('Failed to evolve prompt:', err);
    } finally {
      btnEvolvePrompt.disabled = false;
      btnEvolvePrompt.textContent = '🧬 Evolve Prompt';
    }
  });

  imageForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    btnGenerateImage.disabled = true;
    btnGenerateImage.textContent = 'Rendering Frame...';
    
    const prompt = document.getElementById('img-prompt').value || 'Cute Shihtzu sleeping under starry skies, cozy lofi pixel art';
    
    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      const data = await res.json();
      
      if (data.success) {
        generatedImagePath = data.filePath;
        // Append unique timestamp query parameter to bypass aggressive browser caching
        imagePreview.src = data.filePath + '?t=' + Date.now();
        imagePreviewContainer.classList.remove('hidden');
        checkImage.classList.add('done');
        checkImage.innerHTML = `<span class="bullet">✓</span> Background Image Rendered`;
        
        checkCompileStatus();
      }
    } catch (err) {
      alert('Error generating image: ' + err.message);
    } finally {
      btnGenerateImage.disabled = false;
      btnGenerateImage.textContent = 'Generate Ambient Image';
    }
  });

  // Auto-generate video metadata helper
  async function requestMetadataGen(topic) {
    try {
      const res = await fetch('/api/generate-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic })
      });
      const data = await res.json();
      
      document.getElementById('video-title').value = data.title;
      document.getElementById('upload-desc').value = data.description;
      document.getElementById('upload-tags').value = data.tags.join(', ');
    } catch (err) {
      console.warn('Metadata generation failed:', err);
    }
  }

  // Check compile trigger button status
  const btnCompileVideo = document.getElementById('btn-compile-video');
  function checkCompileStatus() {
    if (generatedAudioPath && generatedImagePath) {
      btnCompileVideo.disabled = false;
    }
  }

  // Studio: Video Compilation
  const compileProgressBar = document.getElementById('compile-progress-bar');
  const progressFill = compileProgressBar.querySelector('.progress-fill');
  const compileProgressStatus = document.getElementById('compile-progress-status');
  const uploadPanel = document.getElementById('upload-panel');

  btnCompileVideo.addEventListener('click', async () => {
    btnCompileVideo.disabled = true;
    compileProgressBar.classList.remove('hidden');
    progressFill.style.width = '10%';
    compileProgressStatus.textContent = 'Initializing video codec and frames...';
    
    // Simulate active encoding ticks
    let progress = 10;
    const progressTimer = setInterval(() => {
      progress += (100 - progress) * 0.15;
      progressFill.style.width = `${Math.floor(progress)}%`;
      if (progress > 85) {
        clearInterval(progressTimer);
        compileProgressStatus.textContent = 'Wrapping up audio multiplexing & H.264 profiles...';
      } else {
        compileProgressStatus.textContent = 'Stitching image & audio stream with FFmpeg (static build)...';
      }
    }, 800);
    
    const title = document.getElementById('video-title').value;
    
    try {
      const res = await fetch('/api/compile-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioPath: generatedAudioPath,
          imagePath: generatedImagePath,
          title
        })
      });
      const data = await res.json();
      
      clearInterval(progressTimer);
      
      if (data.success) {
        progressFill.style.width = '100%';
        compileProgressStatus.textContent = 'Video Render Complete! File ready for uploading.';
        compiledVideoId = data.videoId;
        
        // Unlock Uploading panel
        uploadPanel.classList.remove('disabled');
      } else {
        alert('Video compile failed: ' + data.error);
        btnCompileVideo.disabled = false;
        compileProgressBar.classList.add('hidden');
      }
    } catch (err) {
      clearInterval(progressTimer);
      alert('Error compiling video: ' + err.message);
      btnCompileVideo.disabled = false;
      compileProgressBar.classList.add('hidden');
    }
  });

  // Studio: Upload to YouTube
  const btnUploadVideo = document.getElementById('btn-upload-video');
  btnUploadVideo.addEventListener('click', async () => {
    if (!compiledVideoId) return;
    
    btnUploadVideo.disabled = true;
    btnUploadVideo.textContent = 'Uploading to YouTube...';
    
    const title = document.getElementById('video-title').value;
    const description = document.getElementById('upload-desc').value;
    const tags = document.getElementById('upload-tags').value.split(',').map(t => t.trim());
    const privacyStatus = document.getElementById('upload-privacy').value;
    
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: compiledVideoId,
          title,
          description,
          tags,
          privacyStatus
        })
      });
      const data = await res.json();
      
      if (data.success) {
        let msg = 'Video uploaded successfully!';
        if (data.simulation) {
          msg = 'Simulation Upload complete! Video state updated to mock public feed.';
        }
        alert(msg);
        
        // Redirect to archive
        document.querySelector('[data-tab="archive"]').click();
      } else {
        alert('Upload failed: ' + data.error);
      }
    } catch (err) {
      alert('Error uploading video: ' + err.message);
    } finally {
      btnUploadVideo.disabled = false;
      btnUploadVideo.textContent = 'Upload Video to YouTube';
    }
  });

  // Scraper Tab
  const scraperForm = document.getElementById('scraper-form');
  const scraperResults = document.getElementById('scraper-results');

  scraperForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const query = document.getElementById('scrape-query').value;
    
    scraperResults.innerHTML = '<div class="no-results-msg"><p>Scanning YouTube Search API and parsing elements...</p></div>';
    
    try {
      const res = await fetch(`/api/scrape?query=${encodeURIComponent(query)}`);
      const data = await res.json();
      
      if (data.results && data.results.length > 0) {
        scraperResults.innerHTML = '';
        data.results.forEach(video => {
          const card = document.createElement('div');
          card.className = 'trend-card';
          
          card.innerHTML = `
            <div class="trend-thumb-placeholder">🎹</div>
            <div class="trend-info">
              <div>
                <h4 class="trend-title">${video.title}</h4>
                <div class="trend-meta">
                  <span>Channel: <strong>${video.channel}</strong></span>
                  <span>Views: ${video.views}</span>
                  <span>Duration: ${video.duration}</span>
                  <span>Published: ${video.publishTime}</span>
                </div>
                <p class="trend-desc">${video.description}</p>
              </div>
              <div style="margin-top: 10px;">
                <button class="btn btn-secondary btn-sm" onclick="copyScrapedMetadata('${video.title.replace(/'/g, "\\'")}')">Copy Title Idea</button>
              </div>
            </div>
          `;
          scraperResults.appendChild(card);
        });
      } else {
        scraperResults.innerHTML = '<div class="no-results-msg"><p>No results found or rate limit hit. Try a different query.</p></div>';
      }
    } catch (err) {
      scraperResults.innerHTML = `<div class="no-results-msg"><p>Scraping error: ${err.message}</p></div>`;
    }
  });

  // Copy helper for scraping metadata
  window.copyScrapedMetadata = function(title) {
    document.getElementById('video-title').value = title;
    // Also request generator
    requestMetadataGen(title);
    // Switch back to Studio
    document.querySelector('[data-tab="studio"]').click();
  };

  // Video Archive Loader
  const videoGrid = document.getElementById('video-grid');
  async function loadVideoArchive() {
    videoGrid.innerHTML = '<p style="text-align: center; color: var(--text-muted);">Loading archived videos...</p>';
    
    try {
      const res = await fetch('/api/videos');
      const videos = await res.json();
      
      if (videos.length === 0) {
        videoGrid.innerHTML = '<p style="text-align: center; color: var(--text-muted); grid-column: span 3;">No videos generated yet. Head over to the Studio tab!</p>';
        return;
      }
      
      videoGrid.innerHTML = '';
      videos.forEach(video => {
        const card = document.createElement('div');
        card.className = 'archive-card';
        
        let statusBadgeClass = 'badge-draft';
        if (video.status === 'Public') statusBadgeClass = 'badge-public';
        if (video.status === 'Private') statusBadgeClass = 'badge-private';
        
        const dateStr = new Date(video.dateAdded).toLocaleDateString();
        
        // Link action (youtube watch or local preview)
        const youtubeLink = video.youtubeId ? `https://www.youtube.com/watch?v=${video.youtubeId}` : '#';
        const targetAttr = video.youtubeId ? 'target="_blank"' : '';
        
        card.innerHTML = `
          <img class="archive-thumb" src="${video.thumbnailPath || '/thumbnails/default.jpg'}" alt="Video thumbnail">
          <div class="archive-body">
            <h4 class="archive-title">${video.title}</h4>
            <div class="archive-meta">
              <span>Added: ${dateStr}</span>
              <span class="badge-status ${statusBadgeClass}">${video.status}</span>
            </div>
            <div class="archive-actions">
              <a href="${video.filePath}" class="btn btn-secondary w-100" download style="text-decoration:none; font-size:13px; padding: 8px;">Download MP4</a>
              ${video.youtubeId ? `<a href="${youtubeLink}" ${targetAttr} class="btn btn-glow w-100" style="text-decoration:none; font-size:13px; padding: 8px;">Watch on YT</a>` : ''}
            </div>
          </div>
        `;
        videoGrid.appendChild(card);
      });
    } catch (err) {
      videoGrid.innerHTML = `<p style="text-align: center; color: var(--text-muted);">Failed to load archive: ${err.message}</p>`;
    }
  }

  // Channel Profile Management Tab
  const profileEditForm = document.getElementById('profile-edit-form');
  const profileTitle = document.getElementById('profile-title');
  const profileKeywords = document.getElementById('profile-keywords');
  const profileDesc = document.getElementById('profile-desc');
  const profileFeaturedVideoInput = document.getElementById('profile-featured-video-input');
  const profileFeaturedChannels = document.getElementById('profile-featured-channels');
  
  const previewBannerBg = document.getElementById('preview-banner-bg');
  const previewAvatarImg = document.getElementById('preview-avatar-img');
  const previewChannelTitle = document.getElementById('preview-channel-title');
  const previewChannelSubs = document.getElementById('preview-channel-subs');
  const previewChannelDesc = document.getElementById('preview-channel-desc');
  const previewFeaturedVideo = document.getElementById('preview-featured-video');
  const previewKeywords = document.getElementById('preview-keywords');
  
  const btnUpdateProfile = document.getElementById('btn-update-profile');
  
  async function loadChannelProfile() {
    try {
      const res = await fetch('/api/channel/profile');
      const data = await res.json();
      
      // Update form values
      profileTitle.value = data.title || '';
      profileKeywords.value = data.keywords || '';
      profileDesc.value = data.description || '';
      profileFeaturedVideoInput.value = data.featured_video_id || '';
      
      // Update card preview values
      previewChannelTitle.textContent = data.title;
      previewChannelSubs.textContent = `${data.subscribers} Subscribers • ${data.simulation ? 'Simulated' : 'Live'}`;
      previewChannelDesc.textContent = data.description || 'No description.';
      previewFeaturedVideo.textContent = data.featured_video_id || 'None';
      previewKeywords.textContent = data.keywords || 'None';
      
      if (data.avatar) {
        previewAvatarImg.src = data.avatar + '?t=' + Date.now();
      }
      if (data.banner) {
        previewBannerBg.style.backgroundImage = `url(${data.banner}?t=${Date.now()})`;
      }
    } catch (err) {
      console.error('Failed to load channel profile:', err);
    }
  }
  
  // Submit profile edits
  profileEditForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    btnUpdateProfile.disabled = true;
    btnUpdateProfile.textContent = 'Saving Changes...';
    
    const payload = {
      title: profileTitle.value,
      description: profileDesc.value,
      keywords: profileKeywords.value,
      featuredVideoId: profileFeaturedVideoInput.value,
      avatarPath: '',
      bannerPath: ''
    };
    
    try {
      // 1. Upload avatar if selected
      const avatarFile = document.getElementById('profile-avatar-file').files[0];
      if (avatarFile) {
        const avatarFormData = new FormData();
        avatarFormData.append('avatar', avatarFile);
        const resAv = await fetch('/api/channel/avatar', {
          method: 'POST',
          body: avatarFormData
        });
        const dataAv = await resAv.json();
        if (dataAv.success) {
          payload.avatarPath = dataAv.filePath;
        }
      }
      
      // 2. Upload banner if selected
      const bannerFile = document.getElementById('profile-banner-file').files[0];
      if (bannerFile) {
        const bannerFormData = new FormData();
        bannerFormData.append('banner', bannerFile);
        const resBn = await fetch('/api/channel/banner', {
          method: 'POST',
          body: bannerFormData
        });
        const dataBn = await resBn.json();
        if (dataBn.success) {
          payload.bannerPath = dataBn.filePath;
        }
      }
      
      // 3. Submit text edits & image paths
      const resProfile = await fetch('/api/channel/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const dataProfile = await resProfile.json();
      
      alert(dataProfile.message || 'Profile settings updated successfully!');
      
      // Reload profile
      await loadChannelProfile();
      
      // Reset file fields
      document.getElementById('profile-avatar-file').value = '';
      document.getElementById('profile-banner-file').value = '';
      
    } catch (err) {
      alert('Error updating profile settings: ' + err.message);
    } finally {
      btnUpdateProfile.disabled = false;
      btnUpdateProfile.textContent = 'Apply Profile Modifications';
    }
  });
});
