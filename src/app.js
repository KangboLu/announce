var moment = require('moment');

$(document).ready(function() {
  console.log('document ready');
  Bebo.onReady(function() {
    console.log('bebo ready');
    Bebo.User.get('me', function(err, user){
      if(err){ 
          return console.log('error retrieving user', err);
      }
      var me = user;
      console.log('me', me);

      // show live text preview
      $('.announce--input--text-entry').on('keyup', function(e) {
        console.log(e);
        $('.header--text-preview').html(e.target.value);
        $('.announce--share--button').css('background-color', '#2cbf76');
        if (e.target.value.length === 0) {
          $('.header--text-preview').html("Halo @ Jason's NOW ⚡️");
          $('.announce--share--button').css('background-color', '#888');
        }
      });
    });
  });
});