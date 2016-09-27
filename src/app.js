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

      $('.my-username').html(me.username);
      $('.my-image').attr('src', me.image_url);

      /*
        Listeners
      */
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
              users = [];
              for (var i = 0; i < roster.length; i++) {
                users.push(roster.user_id);
              }
              Bebo.Notification.users(title, body, users, function(err, resp){
                if(err){ return console.log('error sending notification', err) };
                console.log('sent notification', resp);
              });

              // refresh page to see new item
              window.location.reload(true);

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

      /*
        Main functionality
      */
      // Load announcement feed
      Bebo.Db.get('announcements', {}, function(err, data) {
        if (err) {
          return console.log('error getting announcements', err);
        }
        Bebo.Db.get('announcements_reactions', {}, function(reactions_err, reactions) {
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

          // loop through announcements
          for (var i = 0; i < data.result.length; i++) {
            var this_announcement = data.result[i];

            if (this_announcement.username) {
              var username = this_announcement.username;
            } else {
              var username = "";
            }

            if (announcement_reaction[this_announcement.id]) {
              var reactions_html = '<div class="announce--item-reactions" data-id="'+data.result[i].id+'">\
              <p class="announce--item-reactions-header">\
              seen by\
              </p>\
              </div>';
            } else {
              var reactions_html = '';
            }

            var html = '<div class="announce--item" data-id="'+data.result[i].id+'">\
                <div class="announce--item-header">\
                  <img class="announce--item-avatar" src="https://img.bebo.com/image/user/'+data.result[i].user+'">\
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
            var reaction_html = '<div class="announce-feed--item--reactions--item">\
            <img class="announce--item-reaction-avatar" src="https://img.bebo.com/image/user/'+reactions.result[j].user+'">\
            </div>';
            $('.announce--item-reactions[data-id="'+reactions.result[j].announcement+'"]').append(reaction_html);
          }
        });
      });
    });
  });
});
