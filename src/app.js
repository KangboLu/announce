var moment = require('moment');

$(document).ready(function() {
  console.log('document ready');
  Bebo.onReady(function() {
    console.log('bebo ready');
    Bebo.UI.disableKeyboardDoneStrip();
    Bebo.User.get('me', function(err, user){
      if(err){ 
          return console.log('error retrieving user', err);
      }
      var me = user;
      console.log('me', me);

      default_text = "Halo @ Jason's NOW &#x1f46f";

      $('.header--text-preview').html(default_text);

      /*
        Listeners
      */
      // Preview text input
      $('.announce--input--text-entry').on('keyup', function(e) {
        $('.header--text-preview').html(e.target.value);
        $('.announce--share--button').css('background-color', '#2cbf76');
        if (e.target.value.length === 0) {
          $('.header--text-preview').html(default_text);
          $('.announce--share--button').css('background-color', '#888');
        }
      });
      $('body').on('touchstart', function(e) {
        $('.announce--input--text-entry').blur();
      });

      // Share announcement
      $('.announce--share--button').click(function(e) {
        if ($('.announce--input--text-entry').val() !== '') { // don't notify if text input is empty
          var title = "📢";
          var body = $('.announce--input--text-entry').val().toUpperCase();
          Bebo.getRoster(function(err, roster){
            if(err){ return console.log('error getting roster', err) };

            // clear announcement text input & show success state
            $('.announce--input--text-entry').val('');
            $('.announce--share--button').css('background-color', '#888');
            $('.header').css('background-color', '#2cbf76').delay(3000).queue(function() {
              $(this).css('background-color', '#55b5c9');
              $('.header--text-preview').html(default_text);
            });

            // push the notifications
            console.log('got roster', roster);
            users = [];
            for (var i = 0; i < roster.result.length; i++) {
              users.push(roster.result[i].user_id);
            }
            Bebo.Notification.users(title, body, users, function(err, resp){
              if(err){ return console.log('error sending notification', err) };
              console.log('sent notification', resp);
            });
          });
        }
      });
    });
  });
});