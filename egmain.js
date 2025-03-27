const setupVTZoomEffect = () => {
    const vtSection = document.querySelector('.relative.h-\\[300vh\\]'); // Select by Tailwind class
    const vtImage = document.getElementById('vt-zoom-svg');
    
    if (!vtSection || !vtImage) {
      console.log('VT elements not found, attempting alternative selectors');
      // Try alternative selector - the section containing VT image
      const altSection = document.querySelector('section:has(#vt-zoom-image)');
      if (altSection && vtImage) {
        setupVTZoom(altSection, vtImage);
        return;
      }
      return;
    }
    
    setupVTZoom(vtSection, vtImage);
  }
  
  // Helper function to setup the zoom effect
  const setupVTZoom = (section, image) => {
    // Create a GSAP ScrollTrigger for the zoom effect
    gsap.fromTo(image, 
      { scale: 1}, 
      {
        scale: 3, // End scale (zoomed in)
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top", // Start when section enters viewport
          end: "bottom bottom",// End when section leaves viewport
          markers: true, 
          scrub: true, // Smooth scrubbing tied to scroll position
          pin: false, // No need to pin as we're using CSS sticky
          anticipatePin: 1
        }
      }
    );
  }