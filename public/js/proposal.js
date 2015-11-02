'use strict';

module.exports = {
  onEditPageLoad: function (imageName) {
    $('#proposal_form').validator();
    $('#title').characterCounter(75);
    $('#summary').characterCounter(140);

    let imageUploadParams = {'showUpload': false,
      'previewFileType': 'any',
    };
    if (imageName) {
      Object.assign(imageUploadParams, {'initialPreview': [`<img src='/${imageName}' class='file-preview-image'>`]});
    }
    $("#image_upload").fileinput(imageUploadParams)
    .on('filecleared', function(event) {
      $('#delete_image').val("1");
    });

    $('#location').typeahead(null, {
      displayKey: 'description',
      source: (new AddressPicker()).ttAdapter()
    });

    $('#description').summernote({
      height: 300
    });
  }
};


