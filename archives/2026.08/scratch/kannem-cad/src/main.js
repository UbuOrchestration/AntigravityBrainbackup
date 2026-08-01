import './style.css';

// Initialize core components once DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  initBusinessHours();
  initHeaderScroll();
  initMobileNav();
  initServiceTabs();
  initQuoteEstimator();
  initOnboardingForm();
  initPortfolio();
});

/* ==========================================================================
   1. Real-time Business Hours Checker
   ========================================================================== */
function initBusinessHours() {
  const statusIndicator = document.getElementById('office-status');
  if (!statusIndicator) return;

  function updateStatus() {
    try {
      // Get current date/time in Oklahoma City (Central Time Zone)
      const options = { timeZone: 'America/Chicago', hour12: false };
      const okcString = new Date().toLocaleString('en-US', options);
      const okcDate = new Date(okcString);
      
      const day = okcDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      const hour = okcDate.getHours();
      const minutes = okcDate.getMinutes();
      const timeDecimal = hour + (minutes / 60);

      // Business Hours: Monday – Saturday, 9:00 AM – 6:00 PM (9.0 to 18.0)
      const isSunday = (day === 0);
      const isOpen = !isSunday && (timeDecimal >= 9.0 && timeDecimal < 18.0);

      if (isOpen) {
        statusIndicator.className = 'status-indicator open';
        statusIndicator.innerHTML = '<span class="status-dot"></span> Office Open (Mon-Sat 9AM-6PM)';
      } else {
        statusIndicator.className = 'status-indicator closed';
        statusIndicator.innerHTML = '<span class="status-dot"></span> Office Closed (Opens Mon-Sat 9AM)';
      }
    } catch (e) {
      // Fallback if internationalization not supported
      statusIndicator.className = 'status-indicator open';
      statusIndicator.innerHTML = '<span class="status-dot"></span> Office Support Active';
    }
  }

  updateStatus();
  // Update status every minute
  setInterval(updateStatus, 60000);
}

/* ==========================================================================
   2. Header Scroll Effect
   ========================================================================== */
function initHeaderScroll() {
  const header = document.getElementById('main-header');
  if (!header) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });
}

/* ==========================================================================
   3. Mobile Navigation Drawer
   ========================================================================== */
function initMobileNav() {
  const toggle = document.getElementById('mobile-nav-toggle');
  const drawer = document.getElementById('mobile-drawer');
  if (!toggle || !drawer) return;

  toggle.addEventListener('click', () => {
    toggle.classList.toggle('open');
    drawer.classList.toggle('open');
    document.body.classList.toggle('no-scroll');
  });

  // Close drawer when clicking links
  const links = drawer.querySelectorAll('a');
  links.forEach(link => {
    link.addEventListener('click', () => {
      toggle.classList.remove('open');
      drawer.classList.remove('open');
      document.body.classList.remove('no-scroll');
    });
  });
}

/* ==========================================================================
   4. Services Showcase Tab Switcher
   ========================================================================== */
function initServiceTabs() {
  const tabs = document.querySelectorAll('.tab-btn');
  const panels = document.querySelectorAll('.tab-panel');
  if (tabs.length === 0) return;

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetPanelId = tab.getAttribute('aria-controls');
      
      // Deactivate all tabs & panels
      tabs.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      panels.forEach(p => p.classList.remove('active'));

      // Activate clicked
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      const targetPanel = document.getElementById(targetPanelId);
      if (targetPanel) {
        targetPanel.classList.add('active');
      }
    });
  });
}

/* ==========================================================================
   5. Dynamic Cost & Timeline Estimator
   ========================================================================== */
function initQuoteEstimator() {
  const pType = document.getElementById('project-type');
  const pComplexity = document.getElementById('project-complexity');
  const pScale = document.getElementById('project-scale');
  const scaleDisplay = document.getElementById('scale-value-display');
  const priceDisplay = document.getElementById('estimate-price');
  const timelineDisplay = document.getElementById('estimate-timeline');
  const sheetsDisplay = document.getElementById('estimate-drawings');
  const applyBtn = document.getElementById('apply-quote-btn');
  
  if (!pType || !pComplexity || !pScale || !priceDisplay) return;

  function calculateEstimate() {
    const type = pType.value;
    const complexity = pComplexity.value;
    const scale = parseFloat(pScale.value);
    const turnaround = document.querySelector('input[name="turnaround"]:checked').value;

    scaleDisplay.textContent = `${scale.toFixed(1)} ${scale === 1.0 ? 'Acre' : 'Acres'}`;

    let basePrice = 0;
    let ratePerAcre = 0;
    let baseSheets = 2;

    switch (type) {
      case 'survey-support':
        basePrice = 450;
        ratePerAcre = 120;
        baseSheets = scale > 3 ? 3 : 2;
        break;
      case 'plot-plan':
        basePrice = 250;
        ratePerAcre = 75;
        baseSheets = 1;
        break;
      case 'technical-drafting':
        basePrice = 500;
        ratePerAcre = 150;
        baseSheets = scale > 5 ? 4 : 2;
        break;
    }

    // Apply complexity multiplier
    let complexityMultiplier = 1.0;
    if (complexity === 'moderate') {
      complexityMultiplier = 1.25;
    } else if (complexity === 'high') {
      complexityMultiplier = 1.5;
    }

    // Standard linear scaling formula with complexity
    let finalPrice = (basePrice + (ratePerAcre * scale)) * complexityMultiplier;
    let finalTimeline = scale > 4 ? '7-10 Days' : '5-7 Days';

    if (type === 'plot-plan' && scale < 2.0) {
      finalTimeline = '3-4 Days';
    }

    // Apply priority rush fee multiplier (1.5x) and speed up timeline
    if (turnaround === 'rush') {
      finalPrice = finalPrice * 1.5;
      finalTimeline = '48 Hours';
    }

    // Round to nearest 5 dollars
    finalPrice = Math.round(finalPrice / 5) * 5;

    // Update UI elements
    priceDisplay.textContent = finalPrice;
    timelineDisplay.textContent = finalTimeline;
    sheetsDisplay.textContent = baseSheets;
  }

  // Event Listeners
  pType.addEventListener('change', calculateEstimate);
  pComplexity.addEventListener('change', calculateEstimate);
  pScale.addEventListener('input', calculateEstimate);
  
  const radioInputs = document.querySelectorAll('input[name="turnaround"]');
  radioInputs.forEach(input => input.addEventListener('change', calculateEstimate));

  // Initialize
  calculateEstimate();

  // Apply quote to intake form
  if (applyBtn) {
    applyBtn.addEventListener('click', (e) => {
      e.preventDefault();
      
      const type = pType.value;
      const scaleStr = scaleDisplay.textContent;
      const finalPrice = priceDisplay.textContent;
      const finalTimeline = timelineDisplay.textContent;

      // Map values to form step 1
      const formType = document.getElementById('form-service-type');
      const formScale = document.getElementById('form-property-size');
      if (formType) formType.value = type;
      if (formScale) formScale.value = scaleStr;

      // Show applied quote panel in step 3
      const quotePanel = document.getElementById('portal-quote-summary');
      const appliedPrice = document.getElementById('portal-applied-price');
      const appliedTimeline = document.getElementById('portal-applied-timeline');
      if (quotePanel && appliedPrice && appliedTimeline) {
        appliedPrice.textContent = `$${finalPrice}`;
        appliedTimeline.textContent = finalTimeline;
        quotePanel.style.display = 'flex';
      }

      // Smooth scroll to intake section
      const intakeSection = document.getElementById('intake');
      if (intakeSection) {
        intakeSection.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }
}

/* ==========================================================================
   7. Onboarding Intake Form Wizard
   ========================================================================== */
function initOnboardingForm() {
  const form = document.getElementById('onboarding-form');
  const successPanel = document.getElementById('success-panel');
  if (!form || !successPanel) return;

  let currentStep = 1;
  const totalSteps = 3;

  const btnStep1Next = document.getElementById('btn-step1-next');
  const btnStep2Prev = document.getElementById('btn-step2-prev');
  const btnStep2Next = document.getElementById('btn-step2-next');
  const btnStep3Prev = document.getElementById('btn-step3-prev');
  const resetBtn = document.getElementById('btn-reset-form');

  const fileInput = document.getElementById('file-input-field');
  const uploadZone = document.getElementById('upload-zone');
  const fileListContainer = document.getElementById('uploaded-files-list');

  let attachedFiles = [];

  function setStep(step) {
    // Hide all steps
    for (let i = 1; i <= totalSteps; i++) {
      document.getElementById(`form-step-${i}`).classList.remove('active');
      document.getElementById(`indicator-${i}`).classList.remove('active');
    }

    // Show selected step
    document.getElementById(`form-step-${step}`).classList.add('active');
    
    // Highlight step indicators up to active
    for (let i = 1; i <= step; i++) {
      document.getElementById(`indicator-${i}`).classList.add('active');
    }

    currentStep = step;
  }

  // Navigation handlers
  if (btnStep1Next) {
    btnStep1Next.addEventListener('click', () => {
      // Validate step 1 size input and location fields
      const addressInput = document.getElementById('form-property-address');
      const cityInput = document.getElementById('form-property-city');
      const countyInput = document.getElementById('form-property-county');
      const stateInput = document.getElementById('form-property-state');
      const sizeInput = document.getElementById('form-property-size');
      
      let isValid = true;
      
      [addressInput, cityInput, countyInput, stateInput, sizeInput].forEach(input => {
        if (input) {
          if (input.value.trim() === '') {
            input.style.borderColor = 'var(--color-accent-red)';
            isValid = false;
          } else {
            input.style.borderColor = '';
          }
        }
      });
      
      if (!isValid) {
        // Focus first empty field
        const emptyInput = [addressInput, cityInput, countyInput, stateInput, sizeInput].find(input => input && input.value.trim() === '');
        if (emptyInput) emptyInput.focus();
        return;
      }
      
      setStep(2);
    });
  }

  if (btnStep2Prev) btnStep2Prev.addEventListener('click', () => setStep(1));
  if (btnStep2Next) {
    btnStep2Next.addEventListener('click', () => {
      // Allow proceeding even without files, but check if files are still uploading
      const isUploading = attachedFiles.some(f => f.progress < 100);
      if (isUploading) {
        alert('Please wait for files to complete uploading.');
        return;
      }
      setStep(3);
    });
  }

  if (btnStep3Prev) btnStep3Prev.addEventListener('click', () => setStep(2));

  // File Upload Handlers
  if (uploadZone && fileInput) {
    uploadZone.addEventListener('click', () => fileInput.click());

    // Drag-over styling
    uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadZone.classList.add('dragover');
    });

    uploadZone.addEventListener('dragleave', () => {
      uploadZone.classList.remove('dragover');
    });

    uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadZone.classList.remove('dragover');
      if (e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files);
      }
    });

    fileInput.addEventListener('change', () => {
      if (fileInput.files.length > 0) {
        processFiles(fileInput.files);
      }
    });
  }

  function processFiles(files) {
    Array.from(files).forEach(file => {
      // Prevent duplicates
      if (attachedFiles.some(f => f.name === file.name)) return;

      const fileObj = {
        name: file.name,
        size: formatBytes(file.size),
        progress: 0,
        id: 'file_' + Math.random().toString(36).substr(2, 9)
      };

      attachedFiles.push(fileObj);
      renderFileItem(fileObj);
      simulateFileUpload(fileObj);
    });
  }

  function renderFileItem(fileObj) {
    const div = document.createElement('div');
    div.className = 'file-item';
    div.id = fileObj.id;
    div.innerHTML = `
      <div class="file-item-header">
        <span class="file-name">${fileObj.name} <span class="file-size">(${fileObj.size})</span></span>
        <button type="button" class="file-remove" data-id="${fileObj.id}">Remove</button>
      </div>
      <div class="progress-bar-container">
        <div class="progress-bar" id="bar-${fileObj.id}"></div>
      </div>
    `;

    // Remove file handler
    div.querySelector('.file-remove').addEventListener('click', (e) => {
      const id = e.target.getAttribute('data-id');
      attachedFiles = attachedFiles.filter(f => f.id !== id);
      document.getElementById(id).remove();
    });

    fileListContainer.appendChild(div);
  }

  function simulateFileUpload(fileObj) {
    const bar = document.getElementById(`bar-${fileObj.id}`);
    if (!bar) return;

    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 15) + 5;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
      }
      
      fileObj.progress = progress;
      bar.style.width = `${progress}%`;
    }, 250);
  }

  function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Form Submission
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    // Verify step 3 fields
    const name = document.getElementById('form-client-name').value;
    const email = document.getElementById('form-client-email').value;

    // Generate random DWG tracking ID
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const trackingId = `DWG-${randomNum}-OKC`;

    // Show success details
    document.getElementById('mock-project-id').textContent = trackingId;
    document.getElementById('success-email-display').textContent = email;

    // Toggle panels
    form.style.display = 'none';
    successPanel.classList.add('active');

    // Scroll to success panel top
    const intakeSection = document.getElementById('intake');
    if (intakeSection) {
      intakeSection.scrollIntoView({ behavior: 'smooth' });
    }
  });

  // Reset form
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      form.reset();
      attachedFiles = [];
      fileListContainer.innerHTML = '';
      successPanel.classList.remove('active');
      form.style.display = 'block';
      
      // Reset quote summary
      document.getElementById('portal-quote-summary').style.display = 'none';

      setStep(1);
    });
  }
}

/* ==========================================================================
   7. Portfolio Showcase Manager
   ========================================================================== */
function initPortfolio() {
  const grid = document.getElementById('portfolio-grid');
  const dropzone = document.getElementById('portfolio-dropzone');
  const fileInput = document.getElementById('portfolio-file-input');
  const titleInput = document.getElementById('portfolio-title');
  const categoryInput = document.getElementById('portfolio-category');
  const btnAdd = document.getElementById('btn-add-portfolio');
  
  const modal = document.getElementById('portfolio-modal');
  const modalImg = document.getElementById('modal-image');
  const modalCategory = document.getElementById('modal-category');
  const modalTitle = document.getElementById('modal-title');
  const modalClose = document.getElementById('modal-close-btn');

  if (!grid) return;

  // Check if admin parameter is present in URL to allow uploads
  const isAdmin = new URLSearchParams(window.location.search).has('admin');
  const managerPanel = document.querySelector('.portfolio-manager');
  if (managerPanel) {
    if (isAdmin) {
      managerPanel.style.display = 'block';
      console.log('[KANNEM PORTFOLIO] Admin Mode Activated. Portfolio manager visible.');
    } else {
      managerPanel.style.display = 'none';
    }
  }

  const defaultPortfolio = [
    {
      id: 'port_1',
      title: 'Oak Ridge Boundary Survey',
      category: 'Boundary Survey Support',
      image: '/cad_draft_site.png',
      custom: false
    },
    {
      id: 'port_2',
      title: 'Quail Creek Topographic Map',
      category: 'Boundary Survey Support',
      image: '/aerial_site_view.png',
      custom: false
    },
    {
      id: 'port_3',
      title: 'Stonegate Residential Plot Plan',
      category: 'Residential Plot Plan',
      image: '/cad_draft_site.png',
      custom: false
    }
  ];

  let portfolioItems = [];

  function loadPortfolio() {
    const saved = localStorage.getItem('kannem_portfolio');
    if (saved) {
      portfolioItems = JSON.parse(saved);
    } else {
      portfolioItems = [...defaultPortfolio];
      localStorage.setItem('kannem_portfolio', JSON.stringify(portfolioItems));
    }
    renderGrid();
  }

  function renderGrid() {
    grid.innerHTML = '';
    portfolioItems.forEach(item => {
      const card = document.createElement('div');
      card.className = 'portfolio-card';
      card.innerHTML = `
        ${(item.custom && isAdmin) ? `<button class="portfolio-card-delete-btn" data-id="${item.id}">&times;</button>` : ''}
        <div class="portfolio-img-container" data-id="${item.id}">
          <img src="${item.image}" alt="${item.title}">
          <div class="zoom-overlay">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              <line x1="11" y1="8" x2="11" y2="14"></line>
              <line x1="8" y1="11" x2="14" y2="11"></line>
            </svg>
          </div>
        </div>
        <div class="portfolio-card-info">
          <span class="portfolio-category">${item.category}</span>
          <h3>${item.title}</h3>
        </div>
      `;

      // Zoom lightbox handler
      card.querySelector('.portfolio-img-container').addEventListener('click', () => {
        openLightbox(item);
      });

      // Delete custom item handler
      if (item.custom && isAdmin) {
        card.querySelector('.portfolio-card-delete-btn').addEventListener('click', (e) => {
          e.stopPropagation();
          deleteItem(item.id);
        });
      }

      grid.appendChild(card);
    });
  }

  function openLightbox(item) {
    if (!modal || !modalImg) return;
    modalImg.src = item.image;
    modalCategory.textContent = item.category;
    modalTitle.textContent = item.title;
    modal.style.display = 'flex';
  }

  function closeLightbox() {
    if (modal) modal.style.display = 'none';
  }

  if (modalClose) modalClose.addEventListener('click', closeLightbox);
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal || e.target === modalClose) {
        closeLightbox();
      }
    });
  }

  function deleteItem(id) {
    portfolioItems = portfolioItems.filter(item => item.id !== id);
    localStorage.setItem('kannem_portfolio', JSON.stringify(portfolioItems));
    renderGrid();
  }

  // Upload mechanics
  let uploadedImageBase64 = null;

  if (dropzone && fileInput) {
    dropzone.addEventListener('click', () => fileInput.click());

    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('dragover');
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files.length > 0) {
        handleFile(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener('change', () => {
      if (fileInput.files.length > 0) {
        handleFile(fileInput.files[0]);
      }
    });
  }

  function handleFile(file) {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG/JPG).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      uploadedImageBase64 = event.target.result;
      const filename = file.name.length > 30 ? file.name.substring(0, 27) + '...' : file.name;
      dropzone.innerHTML = `
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-teal)" stroke-width="1.5">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
        <p>File loaded: <span style="text-decoration:none;">${filename}</span></p>
        <span class="file-support-text">Ready to add to showcase</span>
      `;
    };
    reader.readAsDataURL(file);
  }

  if (btnAdd) {
    btnAdd.addEventListener('click', () => {
      const title = titleInput.value.trim();
      const category = categoryInput.value;

      if (!title) {
        titleInput.focus();
        titleInput.style.borderColor = 'var(--color-accent-red)';
        return;
      }
      titleInput.style.borderColor = '';

      if (!uploadedImageBase64) {
        alert('Please select or drag-and-drop a drawing image first.');
        return;
      }

      const newItem = {
        id: 'custom_' + Date.now(),
        title: title,
        category: category,
        image: uploadedImageBase64,
        custom: true
      };

      portfolioItems.push(newItem);
      localStorage.setItem('kannem_portfolio', JSON.stringify(portfolioItems));
      renderGrid();

      // Reset Form
      titleInput.value = '';
      uploadedImageBase64 = null;
      dropzone.innerHTML = `
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="upload-icon">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
        </svg>
        <p>Drag and drop drawing files or <span>Browse files</span></p>
        <span class="file-support-text">Supports DWG, PDF, JPG, PNG (Max 15MB)</span>
      `;
    });
  }

  loadPortfolio();
}
