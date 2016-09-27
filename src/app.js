var moment = require('moment');


var me = {};
$(document).ready(function() {
  console.log('document ready');

  Bebo.onReady(function() {
    console.log('bebo ready');
    Bebo.UI.disableKeyboardDoneStrip();

    setupListeners();

    Bebo.Room.onEvent(function(data) {
      load();
    });

    Bebo.User.get('me', function(err, user) {
      if (err) {
        return console.log('error retrieving user', err);
      }
      me = user;
      console.log('me', me);

      $('.my-username').html(me.username);
      $('.my-image').attr('src', me.image_url);

      load();
    });
  });

});

function setupListeners() {
  /* Listeners */
  // Preview text input
  $('.announce--input--text-entry').on('keyup', function(e) {
    $('.announce--share--button').css('background-color', '#2cbf76');
    if (e.target.value.length === 0) {
      $('.announce--share--button').css('opacity', '0.5');
    }
  });

  // Hide keyboard when tapping outside keyboard
  $('body').on('touchstart', function(e) {
    $('.announce--input--text-entry').blur();
  });

  // Share announcement
  $('.announce--share--button').click(function(e) {
    if ($('.announce--input--text-entry').val() !== '') { // don't notify if text input is empty
      var title = "ANNOUNCEMENT: ";
      var body = $('.announce--input--text-entry').val();
      Bebo.getRoster(function(err, roster){
        if(err){ return console.log('error getting roster', err) };

        // clear announcement text input & show success state
        $('.announce--input--text-entry').val('');
        $('.announce--share--button').css('opacity', '0.5').html('<span>Sent</span>');

        // save to db
        Bebo.Db.save('announcements', {'message': body, 'user': me.user_id, 'username': me.username}, function(err, data) {
          if(err) {
            return console.log('error saving announcement', err);
          }
          console.log('successfully saved announcement', data);

          // push the notifications
          console.log('got roster', roster);
          var users = [];
          for (var i = 0; i < roster.length; i++) {
            users.push(roster[i].user_id);
          }

          Bebo.Notification.users(title, body, users, function(err, resp){
            if(err){ return console.log('error sending notification', err) };
            console.log('sent notification', resp);
          });

          Bebo.Room.emitEvent({});
        });
      });
    }
  });

  // Mark as read upon scrolling into viewport
  $('.announce-feed--list').on('DOMNodeInserted', '.announce-feed--item', function(e){
    // Many nodes get inserted, we only want to fire when .announce-feed--item specifically is
    if (e.target.className === 'announce-feed--item') {
      var item = $(this)[0];

      Bebo.Db.get('announcements_reactions', {'announcement': $(item).data('id'), 'user': me.user_id}, function(err, data) {
        if(err) {
          return console.log('error getting announcement reaction', err);
        }
        console.log('looked to see if reaction already exists. length is', data.result.length);
        if (data.result.length === 0) {
          console.log('no reaction found. creating...');
          Bebo.Db.save('announcements_reactions', {'announcement': $(item).data('id'), 'user': me.user_id}, function(err, data) {
            if(err) {
              return console.log('error saving announcement', err);
            }
            console.log('successfully saved announcement reaction', data);
          });
        }
      });
    }
  });
}

function load() {
  /* Main functionality */
  // Load announcement feed

  $('.announce-feed--list').html('');
  $('.announce--share--button').css('opacity', '1.0').html('<span>Send</span>');

  Bebo.Db.get('announcements', {}, function(err, data) {
    if (err) {
      return console.log('error getting announcements', err);
    }
    Bebo.Db.get('announcements_reactions', {count: 500}, function(reactions_err, reactions) {
      if (err) {
        return console.log('error getting reactions', reactions_err);
      }
      console.log('announcements', data);
      console.log('reactions', reactions);

      var announcement_reaction = {};

      for (var k = 0; k < reactions.result.length; k++) {
        var reaction = reactions.result[k];
        var announcement_id = reaction.announcement;
        if (announcement_reaction[announcement_id]) {
          announcement_reaction[announcement_id].push(reaction.user);
        } else {
          announcement_reaction[announcement_id] = [reaction.user];
        }
      }

      console.log('announcement reactions:', announcement_reaction);

      // loop through announcements
      for (var i = 0; i < data.result.length; i++) {
        var this_announcement = data.result[i];
        console.log('this_announcement:', this_announcement);

        var username = "";
        if (this_announcement.username) {
          username = this_announcement.username;
        }

        var reactions_html = '';
        if (announcement_reaction[this_announcement.id]) {
          console.log('seen by header added for', this_announcement.id);
          reactions_html = '<div class="announce--item-reactions" data-id="'+this_announcement.id+'">\
          <p class="announce--item-reactions-header">\
          seen by\
          </p>\
          </div>';
        }

        var ann_image_url = Bebo.Utils.getImageUrl() + 'image/user/' + this_announcement.user;
        var html = '<div class="announce--item" data-id="'+data.result[i].id+'">\
        <div class="announce--item-header">\
        <img class="announce--item-avatar" src="'+ann_image_url+'">\
        <p class="announce--item-name">'+username+'</p>\
        <div class="announce--item-timestamp">\
        '+moment(data.result[i].created_dttm).fromNow()+'\
        </div>\
        </div>\
        <div class="announce--item-message">\
        '+data.result[i].message+'\
        </div>\
        '+reactions_html+'\
        </div>';

        $('.announce-feed--list').append(html);
      }

      // loop through reactions
      for (var j = 0; j < reactions.result.length; j++) {
        var image_url = Bebo.Utils.getImageUrl() + 'image/user/' + reactions.result[j].user;

        var reaction_html = '<div class="announce-feed--item--reactions--item">\
        <img class="announce--item-reaction-avatar" src="'+ image_url+'">\
        </div>';

        $('.announce--item-reactions[data-id="'+reactions.result[j].announcement+'"]').append(reaction_html);
      }
    });
  });
}
