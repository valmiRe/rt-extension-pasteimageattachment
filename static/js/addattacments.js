if (typeof CKEDITOR !== 'undefined')
  CKEDITOR.disableAutoInline = true;

jQuery(function() {
  var pasteCatcher;
  var pasted = false;
  var pastedImage = null;
  var imageTypeRE = /image\/(\w+)/;
  
  jQuery( document ).ready(function initAttachments() {
    pasteCatcher =  jQuery('#PasteImage');
    var formNode = jQuery('#uploadFileButton').parents('form:first');
  
    // setup buttons
    setupPasteButton();
    jQuery('#clearButton').click( function() { clearPasteImage(); } );
    jQuery('#uploadImageButton').click( function() { uploadImage(); } );
    
    if (window.FormData && jQuery('#fileUpload')[0].files) {
      // assume we can upload files with ajax
      jQuery('#uploadFileButton').click( function() { uploadFile(); } );
    } else {
      // fall back to original submit form
      jQuery('#uploadFileButton').click( function() { 
        jQuery("input[name=UpdateAttach]").val('1')
        jQuery("input[name=AddMoreAttach]").val('1')
        formNode.submit();
      });
    }

    // Add the paste event listener, if possible
    try {
      // pasteCatcher.on('paste', function(e) { pasteHandler(e.originalEvent) } );
      // unable to catch exception with jQuery "on" method, so we use addEventListener
      document.getElementById("PasteImage").addEventListener("paste", pasteHandler);
    } catch (ex) {
      jQuery('#PasteAttachmentImage').remove();
    }
    
  });
  
  //////////////////
  
  function pasteHandler(e) {
    if (pasted)
      return false;
          
    // CHROME
    if (e.clipboardData && e.clipboardData.items) {
      var imageFound = false;
      var items = e.clipboardData.items;
      
      for (var i = 0; i < items.length; ++i) {
        if (items[i].kind === 'file' && imageTypeRE.test(items[i].type)) {
          var imageFile = items[i].getAsFile();
          var fileReader = new FileReader();
          fileReader.onloadend = function(e) {
            createImage(this.result,imageFile);
          };
          fileReader.readAsDataURL(imageFile);
          e.preventDefault();
          imageFound = true;
          break;
        }
      }
      if (!imageFound)
          notAnImage();
  
    // IE11
    } else if (window.clipboardData && window.clipboardData.files && e.msConvertURL){
        var fileList = window.clipboardData.files;
        if (fileList.length > 0) {
          for (var i = 0; i < fileList.length; i++){
            var imageFile = fileList[i];
            var url = URL.createObjectURL(imageFile);
            e.msConvertURL(imageFile, "specified", url);
            createImage(url,imageFile);
          }
        } else {
          // not in fileList but maybe pasted in html like firefox
          setTimeout(checkInput, 10);
        }
    
    // Firefox
    } else {
      setTimeout(checkInput, 10);
    }
  }
  
  function checkInput() {
    var child = pasteCatcher.children().first()[0];
    
    if (child && child.tagName === "IMG") {
        var imageFile = dataURLToBlob(child.src);
        createImage(child.src,imageFile);
    } else {
      notAnImage();
    }
  }
  
  
  function setupPasteButton() {
    if (!document.queryCommandSupported('paste') || !window.clipboardData) 
        disablePasteBtn();
    else
      jQuery('#pasteButton').click( function() { execPaste(); } );
  }
  
  function disablePasteBtn() {
    var btn = jQuery("#pasteButton");
    if (btn)
       btn.remove()
  }
  
  function execPaste() {
    pasteCatcher.focus();
    try {
      document.execCommand('paste');
    } catch (ex) {
      alert('Paste command disabled by browser settings. Please use control-v.');
      disablePasteBtn();
    }
  }
  
  
  function notAnImage() {
    setTimeout(clearPasteImage,1);
  }
  
  function clearPasteImage() {
    pasteCatcher.html("");
    jQuery("input[name=PasteImageName]").val("")
    pasteCatcher.attr("contenteditable", "true");
    pasted = false;
    pastedImage = null;
    fileName = null;
  }
  
 
  
  function uploadImage() {
    if (typeof pastedImage !== 'object' || !imageTypeRE.test(pastedImage.type))
      return;
  
    var ext = imageTypeRE.exec(pastedImage.type)[1];
    
    fileName = jQuery("input[name=PasteImageName]").val()
             || RT.CurrentUser.Name+Date.now().toString().substr(-5);
    fileName += "." + ext;
  
    upload(pastedImage,fileName);
    
    clearPasteImage();
  }
  
  function uploadFile() {
    file = jQuery('#fileUpload')[0].files[0];
    upload(file);
  }
  
  function upload(file,filename) {
  
    if (typeof file === 'undefined')
      return;
  
    var fd = new FormData();
    if (filename)
      fd.append('Attach',file,filename);
    else
      fd.append('Attach',file);
    
    fd.append('Token',jQuery("input[name=Token]").val());
  
    var xhr = new XMLHttpRequest();
    xhr.open('POST',RT.Config.WebHomePath + '/Ticket/UpdateSessionAttachments.html', true);
  
  //  xhr.upload.onprogress = function(e) {
  //    if (e.lengthComputable) {
  //      var percentComplete = (e.loaded / e.total) * 100;
  //      console.log(percentComplete + '% uploaded');
  //    }
  //  };
  
    xhr.onload = function() {
      if (this.status == 200) {
        jQuery('#ListSessionsAttachments').html(this.response);
      };
    };
  
    xhr.send(fd);
    
  }
  
  function createImage(url,blob) {
    
    pasteCatcher.html('');
  
    // create an image
    var image = document.createElement("IMG");
    image.style.width = '300px';
    image.src = url;
    
    // insert the image
    var range = window.getSelection().getRangeAt(0);
    range.insertNode(image);
    range.collapse(false);
    
    // set the selection to after the image
    var selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  
    // only paste 1 image at a time
    pasteCatcher.attr("contenteditable", "false");
    pasted = true;
    pastedImage = blob;
  }
  
  function dataURLToBlob(dataURL) {
      var BASE64_MARKER = ';base64,';
      if (dataURL.indexOf(BASE64_MARKER) == -1) {
        var parts = dataURL.split(',');
        var contentType = parts[0].split(':')[1];
        var raw = parts[1];
  
        return new Blob([raw], {type: contentType});
      }
  
      var parts = dataURL.split(BASE64_MARKER);
      var contentType = parts[0].split(':')[1];
      var raw = window.atob(parts[1]);
      var rawLength = raw.length;
  
      var uInt8Array = new Uint8Array(rawLength);
  
      for (var i = 0; i < rawLength; ++i) {
        uInt8Array[i] = raw.charCodeAt(i);
      }
  
      return new Blob([uInt8Array], {type: contentType});
  }
  
});
