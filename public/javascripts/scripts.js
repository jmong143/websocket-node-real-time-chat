function notification (layout, message , type, timeout) {
	  timeout = timeout || 4000;
	  var n = noty({
	      layout: layout,
	      text: message,
	      type: type,
	      theme: 'relax', // or 'relax'
	      timeout: timeout,
	      dismissQueue: true,
	      animation: {
	          open: 'animated bounceIn', // Animate.css class names
	          close: 'animated bounceOut', // Animate.css class names
	          easing: 'swing', // unavailable - no need
	          speed: 500 // unavailable - no need
	      }
	  });
} 
