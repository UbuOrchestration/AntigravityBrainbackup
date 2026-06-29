import './style.css';

// Initialize core components once DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  initBusinessHours();
  initHeaderScroll();
  initMobileNav();
  initServiceTabs();
  initComparisonSlider();
  initQuoteEstimator();
  initOnboardingForm();
  initCadSandbox();
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
   5. Before/After Case Study Slider
   ========================================================================== */
function initComparisonSlider() {
  const container = document.getElementById('comparison-slider');
  const overlay = document.getElementById('overlay-wrapper');
  const handle = document.getElementById('slider-handle');
  if (!container || !overlay || !handle) return;

  let isSliding = false;

  // Set position based on click or drag
  function slide(x) {
    const rect = container.getBoundingClientRect();
    let position = (x - rect.left) / rect.width;
    
    // Bounds check
    if (position < 0) position = 0;
    if (position > 1) position = 1;

    const percentage = position * 100;
    overlay.style.width = `${percentage}%`;
    handle.style.left = `${percentage}%`;
  }

  // Mouse events
  handle.addEventListener('mousedown', () => isSliding = true);
  window.addEventListener('mouseup', () => isSliding = false);
  
  window.addEventListener('mousemove', (e) => {
    if (!isSliding) return;
    slide(e.clientX);
  });

  // Touch events for mobile support
  handle.addEventListener('touchstart', () => isSliding = true);
  window.addEventListener('touchend', () => isSliding = false);
  
  window.addEventListener('touchmove', (e) => {
    if (!isSliding) return;
    if (e.touches.length > 0) {
      slide(e.touches[0].clientX);
    }
  });

  // Allow clicking anywhere on container to jump
  container.addEventListener('click', (e) => {
    if (e.target.closest('#slider-handle')) return; // ignore click on handle itself
    slide(e.clientX);
  });
}

/* ==========================================================================
   6. Dynamic Cost & Timeline Estimator
   ========================================================================== */
function initQuoteEstimator() {
  const pType = document.getElementById('project-type');
  const pScale = document.getElementById('project-scale');
  const scaleDisplay = document.getElementById('scale-value-display');
  const priceDisplay = document.getElementById('estimate-price');
  const timelineDisplay = document.getElementById('estimate-timeline');
  const sheetsDisplay = document.getElementById('estimate-drawings');
  const applyBtn = document.getElementById('apply-quote-btn');
  
  if (!pType || !pScale || !priceDisplay) return;

  function calculateEstimate() {
    const type = pType.value;
    const scale = parseFloat(pScale.value);
    const turnaround = document.querySelector('input[name="turnaround"]:checked').value;

    scaleDisplay.textContent = `${scale.toFixed(1)} ${scale === 1.0 ? 'Acre' : 'Acres'}`;

    let basePrice = 0;
    let ratePerAcre = 0;
    let baseSheets = 2;

    switch (type) {
      case 'survey-support':
        basePrice = 350;
        ratePerAcre = 80;
        baseSheets = scale > 3 ? 3 : 2;
        break;
      case 'plot-plan':
        basePrice = 200;
        ratePerAcre = 50;
        baseSheets = 1;
        break;
      case 'technical-drafting':
        basePrice = 300;
        ratePerAcre = 60;
        baseSheets = scale > 5 ? 4 : 2;
        break;
    }

    // Standard linear scaling formula
    let finalPrice = basePrice + (ratePerAcre * scale);
    let finalTimeline = scale > 4 ? '7-10 Days' : '5-7 Days';

    if (type === 'plot-plan' && scale < 2.0) {
      finalTimeline = '3-4 Days';
    }

    // Apply priority rush fee multiplier (1.5x)
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
      // Validate step 1 size input
      const sizeInput = document.getElementById('form-property-size');
      if (sizeInput && sizeInput.value.trim() === '') {
        sizeInput.style.borderColor = 'var(--color-accent-red)';
        sizeInput.focus();
        return;
      }
      if (sizeInput) sizeInput.style.borderColor = '';
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
   8. Interactive HTML5 CAD Drawing Canvas Workstation
   ========================================================================== */
function initCadSandbox() {
  const canvas = document.getElementById('cad-canvas');
  const wrapper = document.getElementById('canvas-wrapper');
  if (!canvas || !wrapper) return;

  const ctx = canvas.getContext('2d');

  // Layer check boxes
  const chkGrid = document.getElementById('layer-grid');
  const chkBoundary = document.getElementById('layer-boundary');
  const chkContour = document.getElementById('layer-contour');
  const chkUtilities = document.getElementById('layer-utilities');
  const chkAnnotations = document.getElementById('layer-annotations');

  // Tools buttons
  const btnPan = document.getElementById('tool-pan');
  const btnDraw = document.getElementById('tool-draw');
  const btnClear = document.getElementById('clear-sketches');

  // HUD outputs
  const hudX = document.getElementById('hud-coord-x');
  const hudY = document.getElementById('hud-coord-y');
  const hudArea = document.getElementById('hud-calculated-area');
  const crosshairHud = document.getElementById('canvas-hud');
  const crossX = document.getElementById('canvas-x');
  const crossY = document.getElementById('canvas-y');

  // Application State
  let activeTool = 'pan'; // 'pan' or 'draw'
  let mousePos = { x: 0, y: 0 };
  let customPoints = [];
  let isMouseInCanvas = false;

  // Blueprint CAD Geometry datasets
  const parcelBoundary = [
    { x: 150, y: 350 },
    { x: 150, y: 150 },
    { x: 500, y: 150 },
    { x: 500, y: 350 },
    { x: 380, y: 350 },
    { x: 380, y: 280 },
    { x: 270, y: 280 },
    { x: 270, y: 350 }
  ];

  const contourLines = [
    [
      { x: 50, y: 100 },
      { x: 200, y: 120 },
      { x: 450, y: 80 },
      { x: 750, y: 140 }
    ],
    [
      { x: 50, y: 200 },
      { x: 250, y: 230 },
      { x: 500, y: 180 },
      { x: 750, y: 250 }
    ],
    [
      { x: 50, y: 380 },
      { x: 300, y: 400 },
      { x: 550, y: 360 },
      { x: 750, y: 420 }
    ]
  ];

  const utilityLines = [
    {
      type: 'water',
      points: [
        { x: 80, y: 40 },
        { x: 80, y: 460 }
      ]
    },
    {
      type: 'sewer',
      points: [
        { x: 620, y: 40 },
        { x: 620, y: 460 }
      ]
    }
  ];

  // Make canvas responsive
  function resizeCanvas() {
    const rect = wrapper.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = Math.max(350, Math.min(500, rect.width * 0.6));
    draw();
  }

  window.addEventListener('resize', resizeCanvas);
  
  // Set initial dimensions
  setTimeout(resizeCanvas, 100);

  // Redraw canvas with layers
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Draw Blueprint Background Grid
    if (chkGrid && chkGrid.checked) {
      drawGrid();
    } else {
      // Keep background slate color
      ctx.fillStyle = '#060b18';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // 2. Draw Contour topographic lines (orange)
    if (chkContour && chkContour.checked) {
      drawContours();
    }

    // 3. Draw Water/Sewer utility lines (blue/orange-yellow)
    if (chkUtilities && chkUtilities.checked) {
      drawUtilities();
    }

    // 4. Draw Official boundary lines (teal)
    if (chkBoundary && chkBoundary.checked) {
      drawBoundary();
    }

    // 5. Draw Custom user points & loops
    drawCustomSketches();

    // 6. Draw Annotations/Dimensions
    if (chkAnnotations && chkAnnotations.checked) {
      drawAnnotations();
    }

    // 7. Draw Drafting Crosshairs
    if (isMouseInCanvas) {
      drawCrosshairs();
    }
  }

  function drawGrid() {
    ctx.fillStyle = '#060b18';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.lineWidth = 0.5;
    
    // Sub-grid (every 10px)
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.02)';
    ctx.beginPath();
    for (let x = 0; x < canvas.width; x += 10) {
      ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height);
    }
    for (let y = 0; y < canvas.height; y += 10) {
      ctx.moveTo(0, y); ctx.lineTo(canvas.width, y);
    }
    ctx.stroke();

    // Major grid (every 50px)
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.08)';
    ctx.beginPath();
    for (let x = 0; x < canvas.width; x += 50) {
      ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height);
    }
    for (let y = 0; y < canvas.height; y += 50) {
      ctx.moveTo(0, y); ctx.lineTo(canvas.width, y);
    }
    ctx.stroke();
  }

  function drawBoundary() {
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#00f5d4'; // Teal accent
    ctx.fillStyle = 'rgba(0, 245, 212, 0.02)';
    
    ctx.beginPath();
    parcelBoundary.forEach((pt, idx) => {
      if (idx === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    });
    ctx.closePath();
    ctx.stroke();
    ctx.fill();

    // Draw boundary corners as circles
    ctx.fillStyle = '#ef4444';
    parcelBoundary.forEach(pt => {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function drawContours() {
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)'; // Orange transparent
    
    contourLines.forEach(line => {
      ctx.beginPath();
      ctx.moveTo(line[0].x, line[0].y);
      for (let i = 1; i < line.length; i++) {
        ctx.lineTo(line[i].x, line[i].y);
      }
      ctx.stroke();
    });
  }

  function drawUtilities() {
    utilityLines.forEach(line => {
      ctx.lineWidth = 2;
      if (line.type === 'water') {
        ctx.strokeStyle = '#3b82f6'; // Blue
        ctx.setLineDash([8, 4]);
      } else {
        ctx.strokeStyle = '#f59e0b'; // Gold-sewer
        ctx.setLineDash([4, 4]);
      }

      ctx.beginPath();
      ctx.moveTo(line.points[0].x, line.points[0].y);
      ctx.lineTo(line.points[1].x, line.points[1].y);
      ctx.stroke();
      ctx.setLineDash([]); // Reset
    });
  }

  function drawAnnotations() {
    ctx.font = '10px "Fira Code", monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';

    // Label boundary sides
    ctx.fillText("N 89°42' E  350.00'", 300, 140);
    ctx.fillText("S 00°15' W  200.00'", 510, 250);
    ctx.fillText("S 89°42' W  120.00'", 420, 365);
    ctx.fillText("N 00°15' E   70.00'", 390, 310);
    
    // Label Contour Elevations
    ctx.fillStyle = 'rgba(245, 158, 11, 0.5)';
    ctx.fillText("EL 1120'", 700, 130);
    ctx.fillText("EL 1130'", 700, 240);
    ctx.fillText("EL 1140'", 700, 410);

    // Label utility channels
    ctx.fillStyle = '#3b82f6';
    ctx.fillText("8\" W-MAIN", 90, 70);
    ctx.fillStyle = '#f59e0b';
    ctx.fillText("12\" S-MAIN", 630, 70);

    // Site Center tag
    ctx.font = 'bold 12px "Fira Code", monospace';
    ctx.fillStyle = '#00f5d4';
    ctx.fillText("PARCEL LOT A", 280, 210);
    ctx.font = '9px "Inter", sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText("ESTIMATED AREA: 1.52 ACRES", 280, 225);
  }

  function drawCustomSketches() {
    if (customPoints.length === 0) return;

    // Draw lines connecting custom points
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#00f0ff'; // Cyan accent
    
    ctx.beginPath();
    ctx.moveTo(customPoints[0].x, customPoints[0].y);
    for (let i = 1; i < customPoints.length; i++) {
      ctx.lineTo(customPoints[i].x, customPoints[i].y);
    }
    
    // If closed or drawing active, draw line to mouse
    if (activeTool === 'draw' && isMouseInCanvas) {
      ctx.lineTo(mousePos.x, mousePos.y);
    }

    ctx.stroke();

    // Draw points
    ctx.fillStyle = '#00f0ff';
    customPoints.forEach((pt, i) => {
      ctx.beginPath();
      // Draw first point larger to show where to click to close
      const r = (i === 0) ? 6 : 4;
      ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function drawCrosshairs() {
    ctx.lineWidth = 0.5;
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
    
    // Horizontal crosshair
    ctx.beginPath();
    ctx.moveTo(0, mousePos.y);
    ctx.lineTo(canvas.width, mousePos.y);
    ctx.stroke();

    // Vertical crosshair
    ctx.beginPath();
    ctx.moveTo(mousePos.x, 0);
    ctx.lineTo(mousePos.x, canvas.height);
    ctx.stroke();
  }

  // Calculate polygon area using Shoelace formula
  function calculatePolygonArea(pts) {
    if (pts.length < 3) return 0;
    
    let sum = 0;
    for (let i = 0; i < pts.length; i++) {
      const p1 = pts[i];
      const p2 = pts[(i + 1) % pts.length];
      sum += (p1.x * p2.y) - (p2.x * p1.y);
    }

    // Pixels to feet: 1 pixel = 0.5 feet
    // Therefore area in square feet = pixel area * 0.25
    const pixelArea = Math.abs(sum) / 2;
    const sqFtArea = pixelArea * 0.25;
    return sqFtArea;
  }

  // Handle layer toggles redraw
  const layerControls = [chkGrid, chkBoundary, chkContour, chkUtilities, chkAnnotations];
  layerControls.forEach(ctrl => {
    if (ctrl) ctrl.addEventListener('change', draw);
  });

  // Toggle tools state
  if (btnPan) {
    btnPan.addEventListener('click', () => {
      activeTool = 'pan';
      btnPan.classList.add('active');
      if (btnDraw) btnDraw.classList.remove('active');
      canvas.style.cursor = 'crosshair';
    });
  }

  if (btnDraw) {
    btnDraw.addEventListener('click', () => {
      activeTool = 'draw';
      btnDraw.classList.add('active');
      if (btnPan) btnPan.classList.remove('active');
      canvas.style.cursor = 'cell';
    });
  }

  if (btnClear) {
    btnClear.addEventListener('click', () => {
      customPoints = [];
      hudArea.textContent = 'N/A';
      draw();
    });
  }

  // Mouse Listeners
  canvas.addEventListener('mouseenter', () => {
    isMouseInCanvas = true;
    crosshairHud.style.display = 'block';
  });

  canvas.addEventListener('mouseleave', () => {
    isMouseInCanvas = false;
    crosshairHud.style.display = 'none';
    draw();
  });

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    
    // Get mouse coordinates relative to canvas pixels
    // Must scale based on canvas actual width vs pixel width
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    mousePos.x = (e.clientX - rect.left) * scaleX;
    mousePos.y = (e.clientY - rect.top) * scaleY;

    // Telemetry Calculations (1px = 0.5ft, centered relative coordinate system)
    const refX = (mousePos.x * 0.5).toFixed(2);
    const refY = ((canvas.height - mousePos.y) * 0.5).toFixed(2);

    // Update HUD stats
    if (hudX) hudX.textContent = `${refX}'`;
    if (hudY) hudY.textContent = `${refY}'`;
    
    // Update canvas HUD coordinates overlay
    if (crossX) crossX.textContent = refX;
    if (crossY) crossY.textContent = refY;

    // Follow mouse position with overlay HUD
    const containerRect = wrapper.getBoundingClientRect();
    const tooltipX = e.clientX - containerRect.left + 15;
    const tooltipY = e.clientY - containerRect.top + 15;
    crosshairHud.style.left = `${tooltipX}px`;
    crosshairHud.style.top = `${tooltipY}px`;

    draw();
  });

  canvas.addEventListener('click', () => {
    if (activeTool !== 'draw') return;

    // If user clicked close to the first point, close the loop
    if (customPoints.length >= 3) {
      const dist = Math.hypot(mousePos.x - customPoints[0].x, mousePos.y - customPoints[0].y);
      if (dist < 12) {
        // Close polygon
        const sqFt = calculatePolygonArea(customPoints);
        const acres = sqFt / 43560;
        
        hudArea.innerHTML = `<span class="cyan">${sqFt.toLocaleString(undefined, {maximumFractionDigits: 0})} sq ft</span> (${acres.toFixed(2)} Ac)`;
        activeTool = 'pan';
        if (btnPan) btnPan.classList.add('active');
        if (btnDraw) btnDraw.classList.remove('active');
        canvas.style.cursor = 'crosshair';
        draw();
        return;
      }
    }

    // Add point
    customPoints.push({ x: mousePos.x, y: mousePos.y });
    draw();
  });
}
