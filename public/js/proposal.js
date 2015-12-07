'use strict';

module.exports = {
  onProposalEditPageLoad: function (imageSrc = null) {
    $('#proposal_form').validator();
    $('#title').characterCounter(75);
    $('#summary').characterCounter(140);

    let imageUploadParams = {
      'showUpload': false,
      'previewFileType': 'any',
    };
    if (imageSrc) {
      Object.assign(imageUploadParams, {'initialPreview': [`<img src='${imageSrc}' class='file-preview-image'>`]});
    }
    $("#image_upload").fileinput(imageUploadParams)
      .on('filecleared', function (event) {
        $('#delete_image').val("1");
      });

    $('#location').typeahead(null, {
      displayKey: 'description',
      source: (new AddressPicker()).ttAdapter()
    });

    $('#description').summernote({
      height: 300
    });
  },

  onProposalsIndexPageLoad: function () {
    const count = parseInt(document.location.hash.substr(1)) || 0;
    const itemsCount = $('.proposal_list_item').length;
    if ( itemsCount < count || 0 == itemsCount) {
      $.get(`/p/items?skip=${itemsCount}&count=${Math.max(2, count - itemsCount)}`, (data) => {
        $('#proposals_list').append(data);
        document.location.hash = $('.proposal_list_item').length;
        this.setLoadMore();
      })
    }

    $(".hook").change(()=> {
      var form = document.getElementById("filterForm");
      var parentRef = form.elements["parentRef"].value;
      document.location.href = '/p?parent=' + parentRef;
    });

    $("#load_more").click((e)=> {
      if (!this.hasMore()) {
        return;
      }
      $.get(`/p/items?skip=${$('.proposal_list_item').length}&count=2`, (data) => {
        $('#proposals_list').append(data);
        document.location.hash = $('.proposal_list_item').length;
        $.scrollTo($("#load_more"), 500);
        this.setLoadMore();
      })
    });

  },

  hasMore: function() {
    return !$('.proposal_list_item').last().data('is-last');
  },

  setLoadMore: function() {
    const loadMore = $("#load_more");
     if (this.hasMore()) {
       console.log("showing");
       loadMore.show();
     } else {
       console.log("hiding");
       loadMore.hide();
     }
  }

};


