// recorder.js — versão WAV real utilizada pelo Recorder.js
// Fonte original: https://github.com/mattdiamond/Recorderjs
// Adaptado para uso direto com import <script>

(function(window){

  var WORKER_PATH = (function () {
    var scripts = document.getElementsByTagName('script');
    var lastScript = scripts[scripts.length - 1].src;
    var path = lastScript.substring(0, lastScript.lastIndexOf('/') + 1);
    return path + 'recorderWorker.js';
  })();

  var Recorder = function(source, cfg){
    var config = cfg || {};
    var bufferLen = config.bufferLen || 4096;
    this.context = source.context;
    if(!this.context.createScriptProcessor){
       this.node = this.context.createJavaScriptNode(bufferLen, 2, 2);
    } else {
       this.node = this.context.createScriptProcessor(bufferLen, 2, 2);
    }

    var worker = new Worker(WORKER_PATH);
    worker.postMessage({
      command: 'init',
      config: {
        sampleRate: this.context.sampleRate
      }
    });
    var recording = false,
      currCallback;

    this.node.onaudioprocess = function(e){
      if(!recording) return;
      worker.postMessage({
        command: 'record',
        buffer: [
          e.inputBuffer.getChannelData(0),
          e.inputBuffer.getChannelData(1)
        ]
      });
    };

    this.configure = function(cfg){
      for (var prop in cfg){
        if (cfg.hasOwnProperty(prop)){
          config[prop] = cfg[prop];
        }
      }
    };

    this.record = function(){
      recording = true;
    };

    this.stop = function(){
      recording = false;
    };

    this.clear = function(){
      worker.postMessage({ command: 'clear' });
    };

    this.getBuffer = function(cb) {
      currCallback = cb || config.callback;
      worker.postMessage({ command: 'getBuffer' });
    };

    this.exportWAV = function(cb, type){
      currCallback = cb || config.callback;
      type = type || config.type || 'audio/wav';
      worker.postMessage({
        command: 'exportWAV',
        type: type
      });
    };

    worker.onmessage = function(e){
      var blob = e.data;
      currCallback(blob);
    };

    source.connect(this.node);
    this.node.connect(this.context.destination);   // necessário para processamento funcionar
  };

  window.Recorder = Recorder;

})(window);
