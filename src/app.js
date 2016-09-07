var moment = require('moment');
var jquery_p2r = require("./js/jquery-p2r.min.js");

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

      /*
        Listeners
       */
      // Upload & share meme
      $('.add-meme').click(function() {
        var canvas = $(this).siblings('canvas')[0];
        const base64 = canvas.toDataURL('image/jpeg'); // need a data:image/png;base64 string first
        Bebo.uploadImage(base64, function(err, data)  {
          if (err) {
            return console.error('failed to upload', err);
          }
          const meme = {
            image_url: data,
            user: me.user_id,
          };
          Bebo.Db.save("memes", meme, function(err, data) {
            if (err) {
              return console.log("error saving meme", err);
            }
            console.log("successfully saved meme", data);
            // hide meme editor, return to feed, add new meme to top of feed
            $('.meme-editor').hide();
            $('.meme-feed--memes').prepend("<div class='meme-feed--memes--meme'><img src='"+data.result[0].image_url+"'></div>");
            $('.choose-photo').show();
            Bebo.getStream(function(err, stream){
              if(err){ 
                  return console.log('error retreiving stream', err) 
              }
              console.log('stream', stream); 
              Bebo.Notification.roster(stream.theme + ': ', me.username + ' shared a new meme', function(err, resp){ // stream.theme == server name
                if(err){ return console.log('error sending notification', err) };
                console.log('notification sent', resp); // an object containing success
              });
            });
          });
        });
      });
      // Pull to refresh
      $(".meme-feed").pullToRefresh().on("refresh.pulltorefresh", function (event, y){
        console.log('Refreshing...', event, y);
        getMemes();
      });

      /*
        The Main Magic of the Meme Dropin, borrowed from somewhere on github
        TODO: port this stock JS from the author's lib to jQuery, for science
       */
      var e = {}, // A container for DOM elements
        reader = new FileReader(),
        image = new Image(),
        ctxt = null, // For canvas' 2d context
        writeMeme = null, // For writing text on canvas
        renderMeme = null, // For rendering meme on canvas
        get = function (id) {
          // Short for document.getElementById()
          return document.getElementById(id);
        };
      // Get elements (by id):
      e.box1 = get("choose-photo");
      e.ifile = get("ifile");
      e.box2 = get("meme-editor");
      e.topline = get("topline");
      e.bottomline = get("bottomline");
      e.c = get("c"); // canvas;
      // Get canvas context:
      ctxt = e.c.getContext("2d");
      // Function to write text onto canvas:
      writeMeme = function (text, x, y) {
        var f = null; // Font size (in pt)
        text = text.toUpperCase();
        for (f = 36; f >= 0; f -= 1) {
          ctxt.font = "bold " + f + "pt Impact, Charcoal, sans-serif";
          if (ctxt.measureText(text).width < e.c.width - 10) {
            ctxt.fillText(text, x, y);
            ctxt.strokeText(text, x, y);
            break;
          }
        }
      };
      // Function for rendering memes:
      renderMeme = function () {
        ctxt.drawImage(image, 0, 0, e.c.width, e.c.height);
        writeMeme(e.topline.value, e.c.width / 2, 50);
        writeMeme(e.bottomline.value, e.c.width / 2, e.c.height - 20);
      };
      // Event handlers:
      e.ifile.onchange = function () {
        reader.readAsDataURL(e.ifile.files[0]);
        reader.onload = function () {
          image.src = reader.result;
          image.onload = function () {
            // Canvas settings:
            if (image.width < e.box1.clientWidth) {
              e.c.width = image.width;
              e.c.height = image.height;
            } else {
              e.c.width = e.box1.clientWidth;
              e.c.height = image.height * (e.box1.clientWidth / image.width);
            }
            ctxt.textAlign = "center";
            ctxt.fillStyle = "white";
            ctxt.strokeStyle = "black";
            ctxt.lineWidth = 2;
            renderMeme();
            e.box1.style.display = "none";
            e.box2.style.display = "";
          };
        };
      };
      // re-render canvas after each keystroke
      e.topline.onkeyup = renderMeme;
      e.bottomline.onkeyup = renderMeme;

      /*
        Render memes feed
       */
      getMemes();
      function getMemes() {
        Bebo.Db.get('memes', {}, function(err, data) {
          $('.meme-feed--memes').html('');
          console.log('memes', data);
          for (var i = 0; i <= data.result.length; i++) {
            $('.meme-feed--memes').append("<div class='meme-feed--memes--meme'><img src='"+data.result[i].image_url+"' class='meme-feed--memes--meme--image'><br><img src='http://img.blab-dev.im/image/user/"+me.user_id+"' class='meme-feed--memes--meme--profile-photo'><span class='timestamp'>"+moment(data.result[i].created_dttm).fromNow()+"</span></div>");
          }
        });
      }
    });
  });
});