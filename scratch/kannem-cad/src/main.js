import './style.css';
import html2pdf from 'html2pdf.js';

// Initialize core components once DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  initBusinessHours();
  initHeaderScroll();
  initMobileNav();
  initServiceTabs();
  initQuoteEstimator();
  initOnboardingForm();
  initPortfolio();
  initInvoiceGenerator();
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

/* ==========================================================================
   9. Official Invoice Generator Logic
   ========================================================================== */
function initInvoiceGenerator() {
  const container = document.getElementById('invoice-generator');
  if (!container) return;

  const itemsBody = document.getElementById('inv-items-body');
  const addRowBtn = document.getElementById('inv-add-row-btn');
  const subtotalVal = document.getElementById('inv-subtotal-val');
  const discountInput = document.getElementById('inv-discount-input');
  const taxInput = document.getElementById('inv-tax-input');
  const grandTotalVal = document.getElementById('inv-grand-total-val');
  const printBtn = document.getElementById('print-invoice-btn');
  const fromEstimatorBtn = document.getElementById('invoice-from-estimator-btn');

  // Dates setup
  const invDateInput = document.getElementById('inv-date');
  const invDueDateInput = document.getElementById('inv-due-date');
  const invTermsSelect = document.getElementById('inv-terms');

  if (invDateInput && !invDateInput.value) {
    const today = new Date().toISOString().split('T')[0];
    invDateInput.value = today;
    updateDueDate();
  }

  if (invTermsSelect) {
    invTermsSelect.addEventListener('change', updateDueDate);
  }

  function updateDueDate() {
    if (!invDateInput || !invDueDateInput) return;
    const baseDate = new Date(invDateInput.value || Date.now());
    const terms = invTermsSelect.value;
    let daysToAdd = 15;

    if (terms === 'receipt') daysToAdd = 0;
    else if (terms === 'net15') daysToAdd = 15;
    else if (terms === 'net30') daysToAdd = 30;

    baseDate.setDate(baseDate.getDate() + daysToAdd);
    invDueDateInput.value = baseDate.toISOString().split('T')[0];
  }

  // Preset Configurations
  const presets = {
    mockup: [
      { desc: '[REQUIRED: PRIMARY DRAFTING SERVICE - E.G. BOUNDARY SURVEY & CADASTRAL MAPPING]', unit: 'Acres', qty: 1.5, rate: 300 },
      { desc: '[REQUIRED: SECONDARY EXHIBIT - E.G. EASEMENT & UTILITY ENCUMBRANCE DRAFTING]', unit: 'Flat', qty: 1, rate: 250 }
    ],
    boundary: [
      { desc: 'Boundary Survey Field Processing & Cadastral Mapping', unit: 'Acres', qty: 1.5, rate: 80 },
      { desc: 'Deed Boundary Reconciliation & Monument Verification', unit: 'Flat', qty: 1, rate: 350 }
    ],
    plotplan: [
      { desc: 'Residential Plot Plan for Municipal Permitting', unit: 'Flat', qty: 1, rate: 250 },
      { desc: 'Setback Verification & Accessory Structure Layout', unit: 'Flat', qty: 1, rate: 75 }
    ],
    alta: [
      { desc: 'ALTA/NSPS Land Title Survey Support & Boundary Exhibit', unit: 'Flat', qty: 1, rate: 550 },
      { desc: 'Easement & Utility Encumbrance Mapping', unit: 'Hours', qty: 4, rate: 85 }
    ],
    asbuilt: [
      { desc: 'As-Built Infrastructure Mapping & Redline Drafting', unit: 'Sheets', qty: 2, rate: 175 },
      { desc: 'Plan & Profile Piping Utility Exhibit', unit: 'Flat', qty: 1, rate: 150 }
    ]
  };

  // Helper to apply red highlight to placeholder fields
  function updateInputHighlight(input) {
    if (!input) return;
    const val = input.value || '';
    if (val.includes('REQUIRED:') || val.includes('[INSERT') || val.includes('[') || val.includes('MOCK')) {
      input.classList.add('inv-input-red');
    } else {
      input.classList.remove('inv-input-red');
    }
  }

  function updateAllHighlights() {
    container.querySelectorAll('input, select, textarea').forEach(input => {
      updateInputHighlight(input);
    });
  }

  // Load Red Mockup Function
  function loadRedMockup() {
    const invNum = document.getElementById('inv-number');
    const clientName = document.getElementById('inv-client-name');
    const clientCompany = document.getElementById('inv-client-company');
    const clientEmail = document.getElementById('inv-client-email');
    const clientAddress = document.getElementById('inv-client-address');
    const projectAddress = document.getElementById('inv-project-address');
    const dwgRef = document.getElementById('inv-dwg-ref');
    const parcelId = document.getElementById('inv-county-parcel');

    if (invNum) invNum.value = '[REQUIRED: INV-2026-XXXX]';
    if (clientName) clientName.value = '[REQUIRED: CLIENT / ORGANIZATION NAME]';
    if (clientCompany) clientCompany.value = '[REQUIRED: CLIENT COMPANY OR FIRM NAME]';
    if (clientEmail) clientEmail.value = '[REQUIRED: CLIENT BILLING EMAIL ADDRESS]';
    if (clientAddress) clientAddress.value = '[REQUIRED: BILLING ADDRESS, CITY, STATE, ZIP]';
    if (projectAddress) projectAddress.value = '[REQUIRED: PROPERTY SITE LOCATION ADDRESS]';
    if (dwgRef) dwgRef.value = '[REQUIRED: DWG JOB # E.G. DWG-9283-OKC]';
    if (parcelId) parcelId.value = '[REQUIRED: COUNTY PARCEL ID OR LEGAL TRACT #]';

    itemsBody.innerHTML = '';
    presets.mockup.forEach(item => addRow(item.desc, item.unit, item.qty, item.rate));
    updateAllHighlights();
  }

  // Add Itemized Line Row
  function addRow(desc = '', unit = 'Acres', qty = 1, rate = 0) {
    if (!itemsBody) return;

    const tr = document.createElement('tr');
    tr.className = 'inv-item-row';
    tr.innerHTML = `
      <td>
        <input type="text" class="inv-input item-desc" value="${desc}" placeholder="Description of CAD / Survey Service...">
      </td>
      <td>
        <select class="inv-input item-unit">
          <option value="Acres" ${unit === 'Acres' ? 'selected' : ''}>Acres</option>
          <option value="Sheets" ${unit === 'Sheets' ? 'selected' : ''}>Sheets</option>
          <option value="Hours" ${unit === 'Hours' ? 'selected' : ''}>Hours</option>
          <option value="Flat" ${unit === 'Flat' ? 'selected' : ''}>Flat Rate</option>
        </select>
      </td>
      <td>
        <input type="number" class="inv-input item-qty" value="${qty}" min="0.1" step="0.1">
      </td>
      <td>
        <input type="number" class="inv-input item-rate" value="${rate}" min="0" step="1">
      </td>
      <td class="line-amount monospace">$0.00</td>
      <td class="no-print" style="text-align: center;">
        <button type="button" class="inv-delete-line-btn" title="Remove Line">&times;</button>
      </td>
    `;

    // Add event listeners to input fields for instant calculation and highlighting
    const descInput = tr.querySelector('.item-desc');
    const qtyInput = tr.querySelector('.item-qty');
    const rateInput = tr.querySelector('.item-rate');
    const deleteBtn = tr.querySelector('.inv-delete-line-btn');

    if (descInput) {
      descInput.addEventListener('input', (e) => {
        updateInputHighlight(e.target);
        calculateTotals();
      });
      updateInputHighlight(descInput);
    }

    qtyInput.addEventListener('input', calculateTotals);
    rateInput.addEventListener('input', calculateTotals);
    deleteBtn.addEventListener('click', () => {
      tr.remove();
      calculateTotals();
    });

    itemsBody.appendChild(tr);
    calculateTotals();
  }

  // Calculate Totals
  function calculateTotals() {
    let subtotal = 0;
    const rows = itemsBody.querySelectorAll('.inv-item-row');

    rows.forEach(row => {
      const qty = parseFloat(row.querySelector('.item-qty').value) || 0;
      const rate = parseFloat(row.querySelector('.item-rate').value) || 0;
      const amount = qty * rate;
      
      row.querySelector('.line-amount').textContent = `$${amount.toFixed(2)}`;
      subtotal += amount;
    });

    const discount = parseFloat(discountInput ? discountInput.value : 0) || 0;
    const tax = parseFloat(taxInput ? taxInput.value : 0) || 0;

    let grandTotal = subtotal - discount + tax;
    if (grandTotal < 0) grandTotal = 0;

    if (subtotalVal) subtotalVal.textContent = `$${subtotal.toFixed(2)}`;
    if (grandTotalVal) grandTotalVal.textContent = `$${grandTotal.toFixed(2)}`;
  }

  // Global listener for field typing to clear/apply red highlights dynamically
  container.addEventListener('input', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
      updateInputHighlight(e.target);
    }
  });

  // Load Preset Handler
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const presetKey = btn.getAttribute('data-preset');
      if (presetKey === 'mockup') {
        loadRedMockup();
        return;
      }
      const data = presets[presetKey];
      if (!data) return;

      itemsBody.innerHTML = '';
      data.forEach(item => addRow(item.desc, item.unit, item.qty, item.rate));
      updateAllHighlights();
    });
  });

  // Load from Quote Estimator
  if (fromEstimatorBtn) {
    fromEstimatorBtn.addEventListener('click', () => {
      const pTypeSelect = document.getElementById('project-type');
      const pScaleInput = document.getElementById('project-scale');
      const pPriceElem = document.getElementById('estimate-price');

      if (!pTypeSelect || !pScaleInput || !pPriceElem) return;

      const type = pTypeSelect.options[pTypeSelect.selectedIndex].text;
      const scale = parseFloat(pScaleInput.value) || 1.0;
      const price = parseFloat(pPriceElem.textContent) || 450;

      itemsBody.innerHTML = '';
      addRow(`Project Drafting: ${type}`, 'Acres', scale, Math.round(price / scale));

      // Scroll to invoice section
      const invSection = document.getElementById('invoice-generator');
      if (invSection) {
        invSection.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  // Add row button handler
  if (addRowBtn) {
    addRowBtn.addEventListener('click', () => addRow('', 'Flat', 1, 100));
  }

  // Input listener for discount and tax
  if (discountInput) discountInput.addEventListener('input', calculateTotals);
  if (taxInput) taxInput.addEventListener('input', calculateTotals);

  // Download PDF Handler
  const downloadPdfBtn = document.getElementById('download-pdf-btn');
  if (downloadPdfBtn) {
    downloadPdfBtn.addEventListener('click', () => {
      const invNum = document.getElementById('inv-number').value || 'INV-2026-0901';
      const element = document.getElementById('invoice-document');
      
      const opt = {
        margin:       [8, 8, 8, 8],
        filename:     `Kannem_CAD_Invoice_${invNum}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, logging: false },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      element.classList.add('pdf-export-mode');
      html2pdf().set(opt).from(element).save().then(() => {
        element.classList.remove('pdf-export-mode');
      }).catch(err => {
        console.error('PDF Export error:', err);
        element.classList.remove('pdf-export-mode');
        window.print(); // Fallback to print
      });
    });
  }

  // Download Word Document Handler (.doc / .docx)
  const downloadWordBtn = document.getElementById('download-word-btn');
  if (downloadWordBtn) {
    downloadWordBtn.addEventListener('click', () => {
      const invNum = document.getElementById('inv-number').value || 'INV-2026-0901';
      const invDate = document.getElementById('inv-date').value || '';
      const invDueDate = document.getElementById('inv-due-date').value || '';
      const termsSelect = document.getElementById('inv-terms');
      const termsText = termsSelect ? termsSelect.options[termsSelect.selectedIndex].text : 'Net 15 Days';

      const clientName = document.getElementById('inv-client-name').value || 'Client';
      const clientCompany = document.getElementById('inv-client-company').value || '';
      const clientEmail = document.getElementById('inv-client-email').value || '';
      const clientAddress = (document.getElementById('inv-client-address').value || '').replace(/\n/g, '<br>');

      const projectAddress = document.getElementById('inv-project-address').value || 'Project Location';
      const dwgRef = document.getElementById('inv-dwg-ref').value || 'N/A';
      const parcelId = document.getElementById('inv-county-parcel').value || 'N/A';

      const subtotalText = document.getElementById('inv-subtotal-val').textContent || '$0.00';
      const discountVal = document.getElementById('inv-discount-input').value || '0';
      const taxVal = document.getElementById('inv-tax-input').value || '0';
      const grandTotalText = document.getElementById('inv-grand-total-val').textContent || '$0.00';

      // Build itemized rows
      let rowsHtml = '';
      const rows = itemsBody.querySelectorAll('.inv-item-row');
      rows.forEach(row => {
        const desc = row.querySelector('.item-desc').value || 'Service Item';
        const unit = row.querySelector('.item-unit').value || 'Acres';
        const qty = row.querySelector('.item-qty').value || '1';
        const rate = row.querySelector('.item-rate').value || '0';
        const amount = row.querySelector('.line-amount').textContent || '$0.00';

        rowsHtml += `
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #cbd5e1;">${desc}</td>
            <td style="padding: 8px; border-bottom: 1px solid #cbd5e1;">${unit}</td>
            <td style="padding: 8px; border-bottom: 1px solid #cbd5e1; text-align: center;">${qty}</td>
            <td style="padding: 8px; border-bottom: 1px solid #cbd5e1; text-align: right;">$${parseFloat(rate).toFixed(2)}</td>
            <td style="padding: 8px; border-bottom: 1px solid #cbd5e1; text-align: right; font-weight: bold;">${amount}</td>
          </tr>
        `;
      });

      const wordHtml = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
          <meta charset='utf-8'>
          <title>Invoice ${invNum}</title>
          <style>
            body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; margin: 30px; }
            h1 { color: #0b1224; font-size: 24pt; margin: 0 0 4px 0; }
            .subtitle { color: #00f0ff; font-size: 10pt; font-weight: bold; margin-bottom: 20px; }
            .header-table { width: 100%; margin-bottom: 20px; }
            .company-info { font-size: 9.5pt; color: #334155; line-height: 1.5; }
            .inv-meta { text-align: right; font-size: 10pt; }
            .inv-meta h2 { font-size: 20pt; color: #0b1224; margin: 0 0 10px 0; }
            .parties-table { width: 100%; margin-bottom: 24px; }
            .party-cell { width: 50%; vertical-align: top; padding: 12px; background-color: #f8fafc; border: 1px solid #e2e8f0; font-size: 9.5pt; }
            .label { font-weight: bold; color: #0b1224; font-size: 9pt; margin-bottom: 6px; }
            .items-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 9.5pt; }
            .items-table th { background-color: #f1f5f9; color: #0f172a; border-bottom: 2px solid #0b1224; padding: 8px; text-align: left; font-size: 9pt; }
            .totals-table { width: 45%; float: right; margin-bottom: 24px; font-size: 10pt; }
            .totals-table td { padding: 6px; }
            .grand-total { font-size: 13pt; font-weight: bold; color: #0b1224; border-top: 2px solid #0b1224; border-bottom: 2px solid #0b1224; }
            .clear { clear: both; }
            .remittance { background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; font-size: 9pt; color: #334155; line-height: 1.5; }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              <td class="company-info" style="vertical-align: top;">
                <h1>KANNEM</h1>
                <div class="subtitle">PROFESSIONAL CAD SERVICES</div>
                <strong>Kannem Professional CAD Services</strong><br>
                14000 Quail Springs Pkwy<br>
                Oklahoma City, OK<br>
                Office: (405) 355-8123 | Mobile: (321) 960-1143<br>
                Email: info@kannem.com | Web: kannem.com
              </td>
              <td class="inv-meta" style="vertical-align: top;">
                <h2>INVOICE</h2>
                <strong>Invoice #:</strong> ${invNum}<br>
                <strong>Invoice Date:</strong> ${invDate}<br>
                <strong>Due Date:</strong> ${invDueDate}<br>
                <strong>Payment Terms:</strong> ${termsText}
              </td>
            </tr>
          </table>

          <table class="parties-table">
            <tr>
              <td class="party-cell">
                <div class="label">BILL TO (CLIENT):</div>
                <strong>${clientName}</strong><br>
                ${clientCompany ? clientCompany + '<br>' : ''}
                ${clientEmail ? clientEmail + '<br>' : ''}
                ${clientAddress}
              </td>
              <td class="party-cell">
                <div class="label">PROJECT / DWG REFERENCE:</div>
                <strong>Location:</strong> ${projectAddress}<br>
                <strong>DWG Job #:</strong> ${dwgRef}<br>
                <strong>Parcel ID:</strong> ${parcelId}
              </td>
            </tr>
          </table>

          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 45%;">Service Description</th>
                <th style="width: 15%;">Unit Type</th>
                <th style="width: 12%; text-align: center;">Qty</th>
                <th style="width: 13%; text-align: right;">Rate ($)</th>
                <th style="width: 15%; text-align: right;">Amount ($)</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <table class="totals-table">
            <tr>
              <td>Subtotal:</td>
              <td style="text-align: right; font-weight: bold;">${subtotalText}</td>
            </tr>
            <tr>
              <td>Discount:</td>
              <td style="text-align: right;">-$${parseFloat(discountVal).toFixed(2)}</td>
            </tr>
            <tr>
              <td>Sales Tax:</td>
              <td style="text-align: right;">+$${parseFloat(taxVal).toFixed(2)}</td>
            </tr>
            <tr class="grand-total">
              <td>BALANCE DUE:</td>
              <td style="text-align: right;">${grandTotalText}</td>
            </tr>
          </table>

          <div class="clear"></div>

          <div class="remittance">
            <div class="label">REMITTANCE & PAYMENT INSTRUCTIONS:</div>
            Please remit payment via ACH Direct Deposit, Wire Transfer, or Check.<br>
            <strong>Payable To:</strong> Kannem Professional CAD Services<br>
            <strong>Office Remittance Address:</strong> 14000 Quail Springs Pkwy, Oklahoma City, OK<br>
            <strong>Questions/Billing Support:</strong> (405) 355-8123 | info@kannem.com
          </div>
        </body>
        </html>
      `;

      // Create download blob
      const blob = new Blob(['\ufeff', wordHtml], { type: 'application/msword;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Kannem_CAD_Invoice_${invNum}.doc`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }

  // Print button trigger
  if (printBtn) {
    printBtn.addEventListener('click', () => {
      window.print();
    });
  }

  // Load Red Mockup by default so user sees placeholder inputs highlighted in red
  if (itemsBody.children.length === 0) {
    loadRedMockup();
  }
}
