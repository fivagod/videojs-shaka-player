(function() {
  'use strict';

  var Html5;
  if (typeof videojs.getTech === 'function') {
      Html5 = videojs.getTech('Html5');
  } else if (typeof videojs.getComponent === 'function') {
      Html5 = videojs.getComponent('Html5');
  } else {
      console.error('Not supported version if video.js');

      return;
  }
  
  var ShakaTech = videojs.extend(Html5, {
    constructor: function(options, ready) {
      var player = this;

      // Remove the application/dash+xml source so that the browser
      // doesn't try to play it
      var source = options.source;
      delete options.source;

      Html5.call(player, options, ready);
      shaka.polyfill.installAll();

      var video = player.el();
      this.shakaPlayer = new shaka.Player(video);
      //var estimator = new shaka.util.EWMABandwidthEstimator();
      //var shakaSource = new shaka.player.DashVideoSource(source.src, null, estimator);

      this.shakaPlayer.configure({
          abr: {
              enabled: true
          }
      })

      this.shakaPlayer.load(source.src).then(function() {
      if(player.shakaPlayer.isLive()){
          player.duration = function() {
            return Infinity; // the amount of seconds of video 
          }
        }
        player.initShakaMenus();
      });
    },

    initShakaMenus: function() {
      var player = this;
      var shakaPlayer = this.shakaPlayer;

      player.options_['playbackRates'] = [];
      var playerEL = player.el();
      playerEL.className += ' vjs-shaka';

      var shakaButton = document.createElement('div');
      shakaButton.setAttribute('class', 'vjs-shaka-button vjs-menu-button vjs-menu-button-popup vjs-control vjs-button vjs-menu-button-levels');

      var shakaMenu = document.createElement('div');
      shakaMenu.setAttribute('class', 'vjs-menu');
      shakaButton.appendChild(shakaMenu);

      var shakaMenuContent = document.createElement('ul');
      shakaMenuContent.setAttribute('class', 'vjs-menu-content');
      shakaMenuContent.setAttribute('style', 'overflow-y: hidden;');
      shakaMenu.appendChild(shakaMenuContent);

      var videoTracks = shakaPlayer.getVariantTracks();

      var el = document.createElement('li');
      el.setAttribute('class', 'vjs-menu-item vjs-selected');
      var label = document.createElement('span');
      setInnerText(label, "Auto");
      el.appendChild(label);
      el.addEventListener('click', function() {
        var selected = shakaMenuContent.querySelector('.vjs-selected');
        if (selected) {
          selected.className = selected.className.replace('vjs-selected', '')
        }
        this.className = this.className + " vjs-selected";
        shakaPlayer.configure({abr: {enabled: true}});
      });
      shakaMenuContent.appendChild(el);
      var sortedTracks = {};
      for (var i = 0; i < videoTracks.length; ++i) {
        if(typeof sortedTracks[videoTracks[i].height] == 'undefined' || sortedTracks[videoTracks[i].height].audioBandwidth < videoTracks[i].audioBandwidth) {
          sortedTracks[videoTracks[i].height] = videoTracks[i];
        }
      }
      for (var h in sortedTracks) {
          (function() {
            var track = sortedTracks[h];
            var rate = (sortedTracks[h].bandwidth / 1024).toFixed(0);
            var arate = (sortedTracks[h].audioBandwidth / 1024).toFixed(0);
            var height = sortedTracks[h].height;
            var el = document.createElement('li');
            el.setAttribute('class', 'vjs-menu-item');
            el.setAttribute('data-val', rate);
            var label = document.createElement('span');
            setInnerText(label, height + 'p' );// + "p (" + rate + "k)");
            el.appendChild(label);
            el.addEventListener('click', function() {
              var selected = shakaMenuContent.querySelector('.vjs-selected');
              if (selected) {
                selected.className = selected.className.replace('vjs-selected', '')
              }
              this.className = this.className + " vjs-selected";
              shakaPlayer.configure({abr: {enabled: false}});
              shakaPlayer.selectVariantTrack(track, false);
              // TODO: Make opt_clearBuffer a property of this tech
              // If above is set to true, you may wish to uncomment the below
              // player.trigger('waiting');
            })
            shakaMenuContent.appendChild(el);
          }())
      }
      var controlBar = playerEL.parentNode.querySelector('.vjs-control-bar');

      if (controlBar) {
        controlBar.insertBefore(shakaButton, controlBar.lastChild);
      }
    }
  })

  ShakaTech.isSupported = function() {
    return !!window.MediaSource;
  };

  ShakaTech.canPlaySource = function(srcObj) {
    if (srcObj.type === 'application/dash+xml' || srcObj.type === 'application/vnd.ms-sstr+xml') {
      return 'maybe';
    } else {
      return '';
    }
  };

  videojs.options.techOrder.unshift('shaka');

  function setInnerText(element, text) {
    if (typeof element === 'undefined') {
      return false;
    }
    var textProperty = ('innerText' in element) ? 'innerText' : 'textContent';
    try {
      element[textProperty] = text;
    } catch (anException) {
      element.setAttribute('innerText', text);
    }
  }

  videojs.registerTech('Shaka', ShakaTech);
})();
