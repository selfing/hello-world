// module : TEST
(function(window, document){

  'use strict';

  // 테스트 진행코드
  window.UNIT_TEST = true;

  var GLOBAL_VAR$ = {};
  var TEST$ = {};
  var CHECK$ = {};
  var OVERLAP$LIST = {};
  var $OVERLAP_STR = '';

  var IF$ = {};
  var VAR$ = {};
  var TRAIN$ = {};

  var FLOW$LIST = {};
  var FLOW$ = {};
  var $FLOW_COUNT = 0;

  var $VAR_STR = '';
  var $RESULT;
  var $trainStr = '';
  var $preFnName = '';

  window.TEST = function TEST(){

    for(var key in GLOBAL_FN$){
      GLOBAL_VAR$[key] = window[key];
      window[key] = GLOBAL_FN$[key];
    }

    var arg = arguments;
    var len = arg.length;
    var returnStr = '';

    var refreshStr = '';

    for(var i = 0; i<len;i++){

      var fn = arg[i];
      var name = fn.name;
      var obj = getTestObjFn(name, fn);

      if(name === 'that'){
        console.log('"that"은 예약어 이므로 사용할 수 없는 이름입니다.');
        return;
      }

      TEST$[name] = obj;

      refreshStr += '$$$$$_TEST_$$$$$.result$.' + name + ' = function(){ $$$$$_TEST_$$$$$.validation(arguments, ' + name + '); $$$$$_TEST_$$$$$.finish(); };\n\n\n';

      returnStr += name + ' = ' + obj.new + '\n\n\n';
    }

    arg = null;
    returnStr = 'var $$$$$_TEST_$$$$$ = TEST;\n' + returnStr + refreshStr;

    return returnStr;

  };

  // HIDDEN FNS
  TEST.validation = function(_args, _fn){

    var result = _fn.apply(null, _args);

    if($VAR_STR !== ''){
      result = window[$VAR_STR];
      delete window[$VAR_STR];
    }
    $VAR_STR = '';

    if($RESULT === undefined){
      logFn('RESULT', JSON.stringify(result), 'blue');
    }else{
      if(JSON.stringify($RESULT) === JSON.stringify(result)){
        //logFn('테스트 일치!!!', undefined, 'green');
      }else{
        logFn('테스트 불일치!!!', undefined, 'red');
      }
    }
  };
  TEST.check = function(_address, _name){

    $OVERLAP_STR = $OVERLAP_STR + _name + _address;

    if(_name === $preFnName){

      if(CHECK$[_name][_address] instanceof Array){
        FLOW$[($FLOW_COUNT - 1) + '.' + _name] = CHECK$[_name][_address][1];
      }else{
        FLOW$[($FLOW_COUNT - 1) + '.' + _name] = CHECK$[_name][_address];
        CHECK$[_name][_address] = ['FINISH', CHECK$[_name][_address]];
      }

    }else{

      if(CHECK$[_name][_address] instanceof Array){
        FLOW$[($FLOW_COUNT++) + '.' + _name] = CHECK$[_name][_address][1];
      }else{
        FLOW$[($FLOW_COUNT++) + '.' + _name] = CHECK$[_name][_address];
        CHECK$[_name][_address] = ['FINISH', CHECK$[_name][_address]];
      }

    }

    $preFnName = _name;

  };
  TEST.finish = function(){

    FLOW$LIST[$OVERLAP_STR] = FLOW$;

    var arr = OVERLAP$LIST[$OVERLAP_STR];

    if(arr){
      arr[arr.length] = logLine(4);
    }else{
      OVERLAP$LIST[$OVERLAP_STR] = [logLine(4)];
    }
  };
  TEST.if = function(_id, _var, _address, _train){

    $trainStr = _train + _id;
    TRAIN$[_id] = _train + _id;

    VAR$[_id] = _var;

    if(IF$.hasOwnProperty(_address) === false){
      IF$[_address] = {};
    }
    IF$[_address][_id] = false;

    return true;
  };
  TEST.elseIf = function(_id, _var, _address, _train){

    $trainStr = _train + _id;
    TRAIN$[_id] = _train + _id;

    VAR$[_id] = _var;
    IF$[_address][_id] = false;

    return true;
  };
  TEST.else = function(_id, _address, _train){

    $trainStr = _train + _id;
    TRAIN$[_id] = _train + _id;

    VAR$[_id] = '';
    IF$[_address][_id] = false;

    return true;
  };
  TEST.train = function(){
    return $trainStr;
  };

  // GLABAL FNS
  var GLOBAL_FN$ = {
    LOG: function(){

      var arr = OVERLAP$LIST[$OVERLAP_STR];
      var i = arr.length;

      console.group('%c' + 'LOG', 'color:green; font-weight:normal;');
        console.log(FLOW$);
        while(i--){
          console.log('%c' + arr[i]);
        }
      console.groupEnd();


    },
    RESULT : function(_result){

      // init
      $OVERLAP_STR = '';
      $FLOW_COUNT = 0;
      FLOW$ = {};
      $RESULT = _result;
      $preFnName = '';


      return result$;
    },
    END: function(){

      var overLap = {};

      for(var key in OVERLAP$LIST){
        if(OVERLAP$LIST[key].length > 1){
          overLap[key] = OVERLAP$LIST[key];
        }
      }

      console.group('%c' + 'FINISH', 'color:blue; font-weight:normal;');
        console.log(CHECK$);
        for(var key in overLap){
          console.group('%c' + 'FLOW LIST & INTERSECTION', 'color:blue; font-weight:normal;');
            console.log(FLOW$LIST[key]);
            var tempLap = overLap[key];
            for(var i in tempLap){
              console.log(tempLap[i]);
            }
            tempLap = null;
          console.groupEnd();
        }
      console.groupEnd();

      overLap = null;

      var returnStr = '';
      for(var key in TEST$){
        returnStr += key + ' = ' + TEST$[key].org + '\n\n\n';
      }

      result$ = {};

      for(var key in GLOBAL_FN$){

        if(GLOBAL_VAR$[key]){
          window[key] = GLOBAL_VAR$[key];
        }else{
          delete window[key];
        }
      }


      // init
      GLOBAL_VAR$ = {};
      OVERLAP$LIST = {};
      TEST$ = {};
      FLOW$LIST = {};

      return returnStr;
    }
  };

  var getTestObjFn = function(_name, _fn){

    // init
    IF$ = {};
    VAR$ = {};
    TRAIN$ = {};

    var orgStr = _fn.toString() + ';';
    var fnStr = orgStr;

    fnStr = fnStr.replace(/\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*$/mg, function(_a, _b){
      if(_b === undefined){
        return '';
      }else{
        return _b;
      }
    });

    //
    var strObj = {};
    var openArr = [];

    var strCount = 0;
    var len = fnStr.length;
    var openCount = 0;
    var quoteStr = '';
    var newStr = '';
    var ifStr = '';
    var checkStr = '';

    var conditionCount = 0;

    var regException = /(.*)?if\s*\(([^\{]*)\{$/;
    var regElse = /else\s*\{$/;

    // create if string
    for(var key = 0; key<len;key++){
      var str = fnStr[key];
      if((quoteStr.length === 1)){
        if(quoteStr === str){
          quoteStr = '';
          var tempStr = 'Ddddd_' + (strCount++) + '_ddddD';
          checkStr += tempStr;
          newStr += tempStr;
          strObj[tempStr] += str;
        }else{
          strObj['Ddddd_' + strCount + '_ddddD'] += str;
        }
      }else{
        if(str === "'" || str === '"'){
          quoteStr = str;
          strObj['Ddddd_' + strCount + '_ddddD'] = str;
        }
        else{

          newStr += str;
          checkStr += str;

          if(str === '{'){

            var tempStr = null;
            var stop = false;

            checkStr = checkStr.replace(/Ddddd_\w*_ddddD/gm, function(_a){
              return strObj[_a];
            });

            checkStr.replace(regException, function(_a, _else, _var){
              _var = _var.replace(/\)\s*$/gm, '');

              var varStr = '"("+' + JSON.stringify(_var) + '+")"';
              var idStr = '';

              if(_else === undefined){

                // for if
                idStr = '"[' + (conditionCount++) + '_IF]"';
                newStr += 'TEST.check(' + idStr + ', "' + _name + '");';

                tempStr = 'if(TEST.if(' + idStr + ', ' + varStr + ', $$$$$_id_$$$$$ = ($$$$$_set_$$$$$ === true)?$$$$$_id_$$$$$:' + idStr + ', $$$$$_train_$$$$$ = ($$$$$_set_$$$$$ === true)?$$$$$_train_$$$$$:$$$$$_train_$$$$$ + ' + idStr + ',$$$$$_set_$$$$$ = true)){let $$$$$_id_$$$$$ = "";let $$$$$_train_$$$$$ = TEST.train();let $$$$$_set_$$$$$=false;';

              }
              else{

                if(/else\s\s*$/.test(_else) === true){
                  // for else if
                  idStr = '"[' + (conditionCount++) + '_ELSE_IF]"';
                  newStr += 'TEST.check(' + idStr + ', "' + _name + '");';

                  tempStr = 'if(TEST.elseIf(' + idStr + ', ' + varStr + ', $$$$$_id_$$$$$, $$$$$_train_$$$$$)){let $$$$$_id_$$$$$ = "";let $$$$$_train_$$$$$ = TEST.train();let $$$$$_set_$$$$$=false;';

                }else{
                  if(/\s$/.test(_else) === true){

                    // for if
                    idStr = '"[' + (conditionCount++) + '_IF]"';
                    newStr += 'TEST.check(' + idStr + ', "' + _name + '");';

                    tempStr = 'if(TEST.if(' + idStr + ', ' + varStr + ', $$$$$_id_$$$$$ = ($$$$$_set_$$$$$ === true)?$$$$$_id_$$$$$:' + idStr + ', $$$$$_train_$$$$$ = ($$$$$_set_$$$$$ === true)?$$$$$_train_$$$$$:$$$$$_train_$$$$$ + ' + idStr + ',$$$$$_set_$$$$$ = true)){let $$$$$_id_$$$$$ = "";let $$$$$_train_$$$$$ = TEST.train();let $$$$$_set_$$$$$=false;';


                  }else{
                    stop = true;
                  }
                }

              }
            });

            if(tempStr === null && stop === false){
              // for else
              checkStr.replace(regElse, function(_a){

                var idStr = '"[' + (conditionCount++) + '_ELSE]"';
                newStr += 'TEST.check(' + idStr + ', "' + _name + '");';
                tempStr = 'if(TEST.else(' + idStr + ', $$$$$_id_$$$$$,  $$$$$_train_$$$$$)){let $$$$$_id_$$$$$ = "";let $$$$$_train_$$$$$ = TEST.train();let $$$$$_set_$$$$$ = false;';

              });
            }

            // init
            // 속도 개선
            checkStr = '';

            if(tempStr === null){
              openArr[openCount] = false;
            }else{
              ifStr += tempStr;
              openArr[openCount] = true;
            }
            openCount++;

          }
          else if(str === '}'){
            if(openArr[openCount - 1] === true){
              //ifStr += 'TEST.set($$$$$_condition_$$$$$);}';
              ifStr += '}';
            }
            openCount--;
          }

          if(/\n|\t|\s|./.test(str) === false){
            console.log(str + ' <- 이 스트링은 무엇인고?');
          }
        }
      }
    }

    //
    newStr = newStr.replace(/Ddddd_\w*_ddddD/gm, function(_a){
      return strObj[_a];
    });

    //console.log(newStr);

    ifStr = '\nlet $$$$$_id_$$$$$="";\nlet $$$$$_train_$$$$$="";\nlet $$$$$_set_$$$$$=false;\n' + ifStr;

    strObj = null;
    openArr = null;


    //
    var ifFn = new Function(ifStr);
    //console.log(ifFn);
    ifFn();

    var checkObj = CHECK$[_name] = {};

    /*
    console.log(IF$);
    console.log(VAR$);
    console.log(TRAIN$);
    */

    var regAddress = /\[[^\]]*\]/g;

    for(var key in TRAIN$){

      var count = 0;
      var addStr = '';
      var head = checkObj[key] = {};
      var copyObj;

      TRAIN$[key].replace(regAddress, function(_a){

        if(count === 1){
          for(var k in copyObj){
            head[k + VAR$[k]] = copyObj[k];
          }
          addStr = _a + VAR$[_a];
          head[_a + VAR$[_a]] = true;
          count = 0;
        }else{

          if(addStr === ''){
          }else{
            head = head[addStr] = {};
            addStr = '';
          }
          copyObj = IF$[_a];
          count = 1;
        }

      });

      copyObj = null;
      head = null;

    }

    //console.log(newStr);

    return {
      new: newStr,
      org: orgStr
    };
  };

  var logLine = function(num){
    try{
      throw new Error('고의적 에러');
    }catch(e){
      var filtered = e.stack.split('\n');
      return filtered[num].replace(/^\s*/,'');
    }
  };

  var logFn = function(_type, _log, _color){

    try{
      throw new Error('고의적 에러');
    }catch(e){

      if(!e.stack){
        throw new Error('Cannot parse given Error object');
      }

      var filtered = e.stack.split('\n');
      var address = filtered[4].replace(/^\s*/,'');

      console.group('%c' + _type, 'color:' + _color + '; font-weight:normal;');
        if(_log !== undefined){
          console.log('%c' + _log, 'color:#a3a3a3;');
        }
        console.log('%c' + address, 'color:#1155cc;');
      console.groupEnd();
    }
  };

  var result$ = TEST.result$ = {
    that: function(_var){

      $OVERLAP_STR = '[that]';

      if(typeof _var === 'string'){
        $VAR_STR = _var;
        window[_var] = {};
      }else{
        // default setting
        $VAR_STR = 'that';
        window.that = _var;
      }

      return this;
    }
  };

  var html = document.body.innerHTML.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gm, function(script){
    //console.log(script);
    return '';
  });

  function test(){

    var arg = arguments;

    console.log(arg[1]);

    var startStr = JSON.stringify(arg[2]);
    var finalStr = JSON.stringify(FN(arg[0], arg[1]));

    if(startStr === finalStr){
      //console.log(JSON.parse(startStr));
      //console.log(JSON.parse(finalStr));
      console.log(arg[0], 'sucess!!!');
    }else{
      //console.log(JSON.parse(startStr));
      //console.log(JSON.parse(finalStr));
      console.log(arg[0], 'fail!!!');
    }

    arg = null;
    startStr = null;
    finalStr = null;

  };

  window.addEventListener('DOMContentLoaded', function(){

    //
    console.log('테스트 시작 ----------------------------------------------------------------------');


    var body = document.body.cloneNode(true);
    document.body.innerHTML = html;


    // createTree

    document.body = body;
    body = null;

  }, true);

  /*
  window.addEventListener('DOMContentLoaded', function(){
    console.log('window - DOMContentLoaded - capture'); // 1st
  }, true);
  document.addEventListener('DOMContentLoaded', function() {
    console.log('document - DOMContentLoaded - capture'); // 2nd
  }, true);
  document.addEventListener('DOMContentLoaded', function() {
    console.log('document - DOMContentLoaded - bubble'); // 2nd
  });
  window.addEventListener('DOMContentLoaded', function() {
    console.log('window - DOMContentLoaded - bubble'); // 3rd
  });

  window.addEventListener('load', function() {
    console.log('window - load - capture'); // 4th
  }, true);
  document.addEventListener('load', function(e) {

    if(['style','script'].indexOf(e.target.tagName.toLowerCase()) < 0)
    console.log('document - load - capture'); // DOES NOT HAPPEN
  }, true);
  document.addEventListener('load', function() {
    console.log('document - load - bubble'); // DOES NOT HAPPEN
  });
  window.addEventListener('load', function() {
    console.log('window - load - bubble'); // 4th
  });
  window.onload = function() {
    //console.log('window - onload'); // 4th
  };
  */

  /*
  document.onload = function() {
    console.log('document - onload'); // DOES NOT HAPPEN
  };
  */

})(window, document);

// module : FN
(function(window, document){

  "use strict";

  var $WORK = null;
  var FN$ = {};
  var FROM$ = {};
  var FROM$_ORG = {};
  var $WHILE = [];
  var $WHILE_LIMIT = [];

  var getStack = function(){
    //
    var returnObj = {};
    for(var k in $WORK.stack){
      returnObj[k] = $WORK.that[k];
    }
    return returnObj;
  };
  var stack2that = function(stack){
    //
    for(var k in stack){
      $WORK.that[k] = stack[k];
    }
  };
  var player = function(_value, _key, _that, _num, _data){

    //
    var nextNum = _num + 1;
    var nextRun = $WORK.filters[nextNum] || null;

    if(nextRun){

      if($WORK.go === ''){
        // ...
      }else{
        nextRun = nextRun[$WORK.go];
        $WORK.go = '';
      }

      if(_data === true){
        return runner(_value, _key, _that, nextNum, nextRun);
      }
    }
    else{

      if(_data === 'Aaaaa_WHILE_aaaaA'){
        console.log('그냥 넘어감!');
      }
      else{
        console.log('후에 실행할 function 이 없기 때문에 멈춤!');
        return;
      }
    }

    if(_data.constructor === Array){
      if(nextRun !== null){

        var stack = getStack();

        for(var key = 0, len = _data.length; key<len; key++){

          stack2that(stack);

          var value = _data[key];
          var nextValue;

          if($WORK.that){
            nextValue = nextRun.call($WORK.that, value, key);
          }else{
            nextValue = nextRun(value, key);
          }

          if($WORK.break === true){
            $WORK.break = false;
            break;
          }else{
            if(nextValue){
              runner(value, key, undefined, nextNum, null, nextValue);
            }
          }
          nextValue = null;
          value = null;
        }

        stack = null;
      }
    }
    else{

      if(_data === 'Aaaaa_WHILE_aaaaA'){

        var while_ = $WORK.while;
        var limit_ = $WORK.whileLimit;

        if(typeof while_ === 'function'){

          while_();

          var head = $WORK.$while || $WORK.$Q;

          if(head === null){
            return;
          }

          var count = 0;
          var loop;
          while(loop = head.$$$$$_loop_$$$$$){

            if((limit_ > 0) && (limit_ === count)){
              break;
            }
            count++;

            var isBreak = false;
            if(head.$$$$$_Q_$$$$$){
              for(var k in $WORK.stack){
                $WORK.that[k] = head[k];
              }
            }

            if($WORK.continue === true){
              console.log('continue 작업중 !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
            }

            var resultValue = while_(loop);

            head = $WORK.$while;
            if(head === null){
              console.log('null 인 경우가 있다?');
            }
            else{
              if(head.$$$$$_next_$$$$$ === null){
                head = $WORK.$Q;
                if(head === null){
                  isBreak = true;
                }
                else{
                  $WORK.$Q = head.$$$$$_next_$$$$$;
                }
              }
              else{
                head = $WORK.$while = head.$$$$$_next_$$$$$;
              }
            }

            //
            if(resultValue && (nextRun !== null)){

              var nextValue;
              if($WORK.that){
                nextValue = nextRun.call($WORK.that, loop, undefined);
              }else{
                nextValue = nextRun(loop, undefined);
              }

              if($WORK.break === true){

                $WORK.break = false;
                break;
              }else{
                if(nextValue){
                  runner(loop, undefined, undefined, nextNum, null, nextValue);
                }
              }
              nextValue = null;
            }
            resultValue = null;

            if(isBreak === true){
              break;
            }

          }

          head = null;
          loop = null;
        }
        else{

          var key = while_;
          var value = while_;
          var head = null;

          var element = Element;
          var node = Node;
          var count = 0;

          while(key){

            if((limit_ > 0) && (limit_ === count)){
              break;
            }
            count++;

            var go = null;
            var firstGo = null;

            if($WORK.continue === true){
              $WORK.continue = false;
            }
            else{

              // find
              if(typeof value === 'object'){

                if(value instanceof node || value instanceof element){
                  // element
                  // node
                }else{
                  for(var k in value){
                    if(go === null){
                      firstGo = go = {
                        $$$$$_value_$$$$$: value[k],
                        $$$$$_key_$$$$$: k,
                        $$$$$_that_$$$$$: value,
                        $$$$$_next_$$$$$: null
                      }
                    }else{
                      go = go.$$$$$_next_$$$$$ = {
                        $$$$$_value_$$$$$: value[k],
                        $$$$$_key_$$$$$: k,
                        $$$$$_that_$$$$$: value,
                        $$$$$_next_$$$$$: null
                      }
                    }
                    for(var k in $WORK.stack){
                      go[k] = $WORK.that[k];
                    }
                  }
                }
              }

              if(head === null){
                head = firstGo;
              }
              else{
                if(firstGo !== null){
                  go.$$$$$_next_$$$$$ = head;
                  head = firstGo;
                }
              }

              // clear
              go = null;
              firstGo = null;

            }

            if(head === null){
              //console.log('끝');
              break;
            }
            else{

              key = head.$$$$$_key_$$$$$;
              value = head.$$$$$_value_$$$$$;

              for(var k in $WORK.stack){
                $WORK.that[k] = head[k];
              }

              if(nextRun !== null){
                var nextValue;
                if($WORK.that){
                  nextValue = nextRun.call($WORK.that, head.$$$$$_value_$$$$$, key, head.$$$$$_that_$$$$$);
                }else{
                  nextValue = nextRun(head.$$$$$_value_$$$$$, key, head.$$$$$_that_$$$$$);
                }

                if($WORK.break === true){
                  $WORK.break = false;
                  break;
                }else{
                  if(nextValue){
                    runner(head.$$$$$_value_$$$$$, key, head.$$$$$_that_$$$$$, nextNum, null, nextValue);
                  }
                }
                nextValue = null;
              }
              head = head.$$$$$_next_$$$$$;
            }
          }

          // clear memory leak
          head = null;
          key = null;
          value = null;

          element = null;
          node = null;
        }

      }
      else{
        if(nextRun !== null){

          var stack = getStack();

          for(var key in _data){

            stack2that(stack);

            //
            var value = _data[key];

            var nextValue;
            if($WORK.that){
              nextValue = nextRun.call($WORK.that, value, key);
            }else{
              nextValue = nextRun(value, key);
            }
            if($WORK.break === true){
              $WORK.break = false;
              break;
            }else{
              if(nextValue){
                runner(value, key, undefined, nextNum, null, nextValue);
              }
            }
            nextValue = null;
            value = null;

          }

          stack = null;

        }
      }
    }

    // clear memory
    nextRun = null;
    return;
  };
  var runner = function(_value, _key, _that, _num, _fn, _data){

    var nextValue;

    if(_fn === null){
      nextValue = _data;
    }
    else{

      if($WORK.that){
        nextValue = _fn.call($WORK.that, _value, _key, _that);
      }
      else{
        nextValue = _fn(_value, _key, _that);
      }
    }

    if(nextValue){

      // clear
      _data = null;
      _fn = null;

      return player(_value, _key, _that, _num, nextValue);
    }
    else{

      // clear
      nextValue = null;
      _value = null;
      _key = null;
      _num = null;
      _fn = null;
      _data = null;

      return;
    }

  };

  var runTest = false;
  var run = function(_name, _args, _that, _filters, _count){

    var stack = {};

    if(_filters !== null){
      //
    }
    else{

      _that = _args[_count];

      var len = _args.length;
      var whileCount = 0;

      if(typeof _that === 'function' || _that === 'Aaaaa_WHILE_aaaaA'){
        _that = null;
        _filters = Array(len - _count);
      }else{
        _count = _count + 1;
        _filters = Array(len > _count ? len - _count : 0);
      }

      for(var key = _count;key<len;key++){

        var fn = _args[key];

        if(fn === 'Aaaaa_WHILE_aaaaA'){

          _filters[key - _count] = (function(_while, _limit){
            return function(){
              return WHILE(_while, _limit);
            };
          })($WHILE[whileCount], $WHILE_LIMIT[whileCount]);
          whileCount++;

        }else{
          _filters[key - _count] = _args[key];
        }
      }

      // clear
      $WHILE = [];
      $WHILE_LIMIT = [];

    }

    // /* 테스트 코드
    if(UNIT_TEST === true){

      //
      if(runTest === false){

        /*

        //
        if(typeof _name === 'string'){
          // 테스트를 위한 오리지널 데이터를 모두 기록
          FROM$_ORG[_name] = JSON.stringify(_that);
        }
        runTest = true;

        FN(
          WHILE(_that),
          function(_value, _key, _that){
            if(typeof _value === 'string'){
              _value.replace(/^\@\@\@\@\@\_(.*)\_\@\@\@\@\@$/, function(_a, _b){
                // change
                _that[_key] = dataFromName(_b);
              });
            }
          }
        );

        runTest = false;
        */

      }
    }
    // */

    // for stack
    for(var key in _that){
      if(/^\_/.test(key)){

      }else if(/^\$/.test(key)){
        stack[key] = _that[key];
      }
    }

    var loopObj = {};

    $WORK = {
      working: $WORK,
      that: _that,
      stack: stack,
      filters: _filters,

      $while: null,
      $Q:null,

      break: false,
      continue: false,
      go: '',
      while: null,
      whileLimit: 0
    }

    // do
    runner(undefined, undefined, undefined, 0, _filters[0], null);

    // clear local memory
    stack = null;

    //
    $WORK = $WORK.working;
    return _that;
  };

  var dataFromName = function(_name){

    var arr = _name.split('.'),
      i = 1,
      len = arr.length,
      pointer = FROM$[arr[0]];

    for(;i<len;i++){
      pointer = pointer[arr[i]];
    }
    arr = null;
    return pointer;
  };

  function FN(_name, _that, _fn){

    if(_name === 'Aaaaa_WHILE_aaaaA'){
      return run(undefined, arguments, null, null, 0);
    }
    else if(typeof _name === 'string'){

      if(typeof _that === 'function' || (_that === 'Aaaaa_WHILE_aaaaA')){
        // 실행
        return FROM$[_name] = run(_name, arguments, null, null, 1);
      }
      else if(_that === undefined){
        console.log('만약 데이터set 이 셋팅이 되어있다면 어떤 데이터를 넣어야하는지 안내 하는걸 만들어라!!');
        return;
      }
      // 유닛 테스트중
      /*
      else if(_that === 'UNIT_TEST'){
        if(_fn === undefined){
          console.log('데이터도 없이 테스트 할래? 데이터 넣고 다시와라!!!');
          return;
        }
        else if(typeof _fn === 'function'){
          console.log('데이터도 없이 테스트 할래? 데이터 넣고 다시와라!!!');
          console.log('그런데 이건 데이터 없이도 테스트 해야하는거 아니냐? 생각해봐라.');
          return;
        }
        //else if(_fn instanceof Object){
        else{
          _that = _fn;

          var returnValue;
          //var startStr = JSON.stringify(_that);

          console.log('연결고리 작업중');
          console.log(_that);

          FN(
            function(){

              return WHILE(
                function(node){

                }
                //document.body,
                (node = document.body) => {


                  STACK(node.firstChild);
                  STACK(node.nextSibling);

                  console.log(node);

                  if(_value === 3){
                    return false;
                  }else{

                    SELF(_value + 1);

                    //SELF(3);
                    //SELF(4);
                    //console.log(this);
                    //this(1);
                    //this(2);
                    //return _value + 1;
                  }

                }

              );
            }

            WHILE([1, 2]),
            function(_value, _key){
              console.log();
            }

            function(){

              return WHILE(
                JSON.stringify(_that),
                function(str){

                  console.log(str);

                  return false;
                }
              );
            }
          );

          console.log(_that);

          //pick(_name, JSON.stringify(_that));

          return;

          var currentThat = JSON.parse(startStr);

          console.log(_name);
          console.log(startStr);

          console.log('UNIT_TEST');

          returnValue = run(_name, arguments, _that, FN$[_name], 2);

          console.log(returnValue);

          return;

        }

        var resultStr = JSON.stringify(returnValue);

        console.log('test("' + _name + '", '+ startStr +  ', ' + resultStr + ');');

        //var html = document.body.innerHTML.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gm, '');
        //console.log(html);

        return returnValue;

      }
      */
      //else if(_that instanceof Object){
      else{

        // 실행
        if(typeof _fn === 'function' || (_fn === 'Aaaaa_WHILE_aaaaA')){
          // 미등록 실행
          console.log('미등록_실행');
          //console.log(_that);
          return run(_name, arguments, null, null, 1);
        }
        // if(_fn === undefined)
        else{

          var filters;
          if(filters = FN$[_name]){
            //'FN$에 미리 셋팅 되어진 FN 사용하기';
          }else{
            console.log(FN$, '에 "'  + _name + '" 라는 이름없는거 보이지? 셋팅하고 다시와라!!!');
            return 'FN$에 미리 셋팅 되어진 FN 사용하기 오류 메시지';
          }

          // 등록-실행
          return FROM$[_name] = run(_name, undefined, _that, filters, undefined);
        }
      }
    }
    else{

      //
      if((_name === undefined) && (_that === undefined)){
        // 안내
        console.log('FNS', FN$);
        return 'FN을 사용할수있도록 메뉴얼을 제공';
      }
      else{
        // 일반 실행
        // typeof _name === 'function'
        //console.log('일반_실행');
        return run(undefined, arguments, null, null, 0);
      }
    }

  };
  function SET(_name){

    var args = arguments;
    var len = args.length;
    var filters = Array(len - 1);

    var whileCount = 0;

    for (var key = 1; key < len; key++){
      var fn = args[key];
      if(fn === 'Aaaaa_WHILE_aaaaA'){
        filters[key - 1] = (function(_while, _limit){
          return function(){
            return WHILE(_while, _limit);
          };
        })($WHILE[whileCount], $WHILE_LIMIT[whileCount]);
        whileCount++;
      }else{
        filters[key - 1] = args[key];
      }
      fn = null;
    }

    // clear
    $WHILE = [];
    $WHILE_LIMIT = [];
    //
    FN$[_name] = filters;

    args = null;
    filters = null;

    return _name + ' set ok!';

  };

  var returnQ = {
    Q: function(_loop){

      if(_loop === undefined || _loop === null){
        //console.log(_loop);
      }
      else{

        var obj = {
          $$$$$_Q_$$$$$: true,
          $$$$$_loop_$$$$$: _loop,
          $$$$$_next_$$$$$: $WORK.$Q
        };

        for(var k in $WORK.stack){
          obj[k] = $WORK.that[k];
        }

        $WORK.$Q = obj;
        obj = null;

      }

      return this;
    }
  };
  function Q(_loop, node){

    if(_loop === undefined || _loop === null){
      //console.log(_loop);
    }
    else{

      var obj = {
        $$$$$_loop_$$$$$ : _loop,
        $$$$$_next_$$$$$ : null
      };

      if($WORK.$while === null){
        // 최초에만 null 값을 가짐
        // init
        $WORK.$while = $WORK.$while_head = obj;
      }else{
        // loop
        $WORK.$while_head = $WORK.$while_head.$$$$$_next_$$$$$ = obj
      }

      // clear
      obj = null;

    }

    return returnQ;
  };
  function WHILE(_while, _limit){

    if($WORK === null){
      $WHILE[$WHILE.length] = _while;
      $WHILE_LIMIT[$WHILE_LIMIT.length] = _limit || 0;
    }else{
      $WORK.while = _while;
      $WORK.whileLimit = _limit || 0;
    }
    return 'Aaaaa_WHILE_aaaaA';
  };
  function CONTINUE(){
    $WORK.continue = true;
  };
  function BREAK(){

    $WORK.break = true;
  };
  function GO(_name){
    $WORK.go = _name;
  };
  function FROM(_name){
    if(UNIT_TEST === true){
      return 'Aaaaa_' + _name + '_aaaaA';
    }else{
      return dataFromName(_name);
    }
  }

  window._ = {
    FN: FN,
    SET: SET,
    Q: Q,
    WHILE: WHILE,
    CONTINUE: CONTINUE,
    BREAK: BREAK,
    GO: GO,
    FROM: FROM
  };

  // 테스트
  if(true){

    eval(TEST(
      FN,
      SET,
      player,
      runner,
      run
    ));

    /*
    var GO_TEST = {
      first_this: function(){
        this['GO_first_this'] = true;
      },
      first_that: function(){
        that['GO_first_that'] = true;
      },
      while: function(){
        console.log('while');
      },
      normal: function(){
        console.log('normal');
      }
    }

    var node = {
      count : 0,
      next: {
        count : 1,
        next: {
          count : 2,
          next: {
            count : 3,
            next: null,
            other: {
              count : 100
            }
          }
        }
      }
    };

    RESULT("normal set ok!")
    .SET('normal',
    function(){
      this.normal = true;
    });

    RESULT("normal_train set ok!")
    .SET('normal_train',
    function(){
      return true;
    },
    function(){
      this.normal_train = true;
    });

    RESULT("fn WHILE set ok!")
    .SET('fn WHILE',
    function(){
      return WHILE({});
    })

    RESULT("single WHILE set ok!")
    .SET('single WHILE',
      WHILE({})
    );

    RESULT({"normal_train":true})
    .FN(
      'normal_train',
      {}
    );


    RESULT({"normal":true})
    .FN(
      'normal',
      {}
    );

    RESULT({"aaa":1})
    .that({})
    .FN(
      function(){
        return {aaa:1, bbb:{aaa:'aaa'}, ccc:3, ddd:4};
      },
      function(_value, _key){
        that[_key] = _value;
        BREAK();
      }
    );

    RESULT({"aaa":1,"bbb":{"aaa":"aaa"},"ccc":3,"ddd":4})
    .that({})
    .FN(
      function(){
        return {aaa:1, bbb:{aaa:'aaa'}, ccc:3, ddd:4};
      },
      function(_value){
        return true;
      },
      function(_value, _key){
        that[_key] = _value;
      }
    );

    RESULT({"aaa":1,"bbb":2,"ccc":3,"ddd":4})
    .FN(
      {},
      function(){
        return WHILE({aaa:1, bbb:2, ccc:3, ddd:4});
      },
      function(_value){
        return true;
      },
      function(_value, _key){
        this[_key] = _value;
      }
    );

    RESULT({"count":2})
    .FN(
      {count:0},
      function(){
        return WHILE({aaa:1, bbb:2, ccc:3, ddd:4});
      },
      function(_value){
        if(_value === 2){
          BREAK();
        }
        this.count++;
      }
    );

    RESULT({"value":2})
    .FN(
      {},
      function(){
        return {aaa:1, bbb:2, ccc:3};
      },
      function(_value){
        if(_value === 2){
          return true;
        }else{
          return false;
        }
      },
      function(_value){
        this.value = _value;
      }
    );

    RESULT({"node or element 일경우 그냥 넘어감":true})
    .FN(
      {},
      function(){
        this['node or element 일경우 그냥 넘어감'] = true;
        return WHILE(document.body);
      }
    );

    RESULT({"aaa":1})
    .FN(
      {},
      WHILE({aaa: 1, bbb: 2, ccc: 3}, 1),
      function(_value, _key){
        this[_key] = _value;
      }
    );


    RESULT({"count":1})
    .FN(
      {
        count: 0
      },
      WHILE(['aaa', 'bbb', 'ccc'], 1),
      function(){
        this.count++;
      }
    );


    RESULT({"count":1,"limit":true})
    .FN(
      {
        count: 0
      },
      function(){

        this.limit = true;

        return WHILE(function(_node){
          if(_node === undefined){
						_node = node;
					}
          // 큐가 쌓이는 만큼 WHILE
          Q(_node.next);
          return true;
        }, 1);
      },
      function(){
        this.count++;
      }
    );

    RESULT({"count":3})
    .that({
      count: 0
    })
    .FN(
      function(){
        return WHILE(function(_node){
          if(_node === undefined){
						_node = node;
					}
          // 큐가 쌓이는 만큼 WHILE
          Q(_node.next);
          return true;
        });
      },
      function(_value){
        that.count++;
      }
    );


    // continue 작업중이므로 다시 셋팅하자~~!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    RESULT({"count":2})
    .FN(
      {
        count: 0
      },
      function(){
        return WHILE(function(_node){
          if(_node === undefined){
						_node = node;
					}
          if(_node.next === null){
            return false;
          }
          // 큐가 쌓이는 만큼 WHILE
          Q(_node.next);
          return true;
        });
      },
      function(_value, _key){
        if(_value.count === 1){
          CONTINUE();
        }
        return true;
      },
      function(){
        this.count++;
      }
    );

    RESULT({"count":1})
    .FN(
      {
        count: 0
      },
      function(){
        return WHILE(function(_node){
          if(_node === undefined){
						_node = node;
					}
          // 큐가 쌓이는 만큼 WHILE
          Q(_node.next);
          return true;
        });
      },
      function(_value, _key){
        if(_value.count === 1){
          BREAK();
        }
        this.count++;
      }
    );

    RESULT({"count":2})
    .FN(
      {
        count: 0
      },
      function(){
        return WHILE(function(_node){
          if(_node === undefined){
						_node = node;
					}
          if(_node.next === null){
            return false;
          }
          // 큐가 쌓이는 만큼 WHILE
          Q(_node.next);
          return true;
        });
      },
      function(_value, _key){
        return true;
      },
      function(){
        this.count++;
      }
    );

    RESULT({"count":0})
    .FN(
      {
        count: 0
      },
      function(){
        return WHILE(function(_node){
          if(_node === undefined){
						_node = node;
					}
          // 큐가 쌓이는 만큼 WHILE
          Q(_node.aaa);
          return true;
        });
      },
      function(_value, _key){

      }
    );


    RESULT({"count":4,"other":true})
    .FN(
      {
        count: 0
      },
      function(){
        return WHILE(function(_node){

          if(_node === undefined){
						_node = node;
					}

          // 큐가 쌓이는 만큼 WHILE
          Q(_node.next).Q(_node.other);
          return true;

        });
      },
      function(_value, _key){
        this.count++;
        if(_value.count === 100){
          this['other'] = true;
        }

      }
    );

    RESULT({"count":2})
    .FN(
      {
        count: 0
      },
      function(){
        return WHILE(function(_node){

          if(_node === undefined){
						_node = node;
					}

          if(_node.next === null){
            return false;
          }

          // 큐가 쌓이는 만큼 WHILE
          Q(_node.next);
          return true;

        });
      },
      function(_value, _key){
        this.count++;
      }
    );


    RESULT({"0":"aaa","break":true})
    .FN(
      {},
      function(){
        return ['aaa', 'bbb'];
      },
      function(_value, _key){
        this.break = true;
        this[_key] = _value;
        BREAK();
      }
    );


    RESULT({"0":"aaa","1":"bbb","Array type start!":true,"that":true,"0이전에 완료된 loop의 연장 function":"aaa","1이전에 완료된 loop의 연장 function":"bbb"})
    .that({})
    .FN(
      function(){
        that['Array type start!'] = true;
        that['that'] = true;
        return ['aaa', 'bbb'];
      },
      function(_value, _key){
        that[_key] = _value;
        return true;
      },
      function(_value, _key){
        that[_key + '이전에 완료된 loop의 연장 function'] = _value;
      }
    );

    RESULT({"0":"aaa","1":"bbb","Array type start!":true,"that":true})
    .that({})
    .FN(
      function(){
        that['Array type start!'] = true;
        that['that'] = true;
        return ['aaa', 'bbb'];
      },
      function(_value, _key){
        that[_key] = _value;
      }
    );

    RESULT({"0":"aaa","1":"bbb","this":true,"Array type start!":true})
    .FN(
      {},
      function(){
        this['this'] = true;
        this['Array type start!'] = true;
        return ['aaa', 'bbb'];
      },
      function(_value, _key){
        this[_key] = _value;
      }
    );

    ///*

    RESULT({"GO_first_that":true})
    .that({})
    .FN(
      function(){
        GO('first_that');
        return true;
      },
      GO_TEST
    );


    RESULT({"GO_first_this":true})
    .FN(
      {},
      function(){
        GO('first_this');
        return true;
      },
      GO_TEST
    );


    RESULT({"a":"미등록 실행(this 없음)"})
    .that({})
    .FN(
      '이름',
      function(){
        that.a = '미등록 실행(this 없음)';
      }
    );

    RESULT({"a":1})
    .that({
      a: 0
    })
    .FN(
      function(){
        that.a = 1
      }
    );

    RESULT({"aaa":1})
    .that({})
    .FN(
      WHILE({aaa: 1}),
      function(_value, _key){
        that[_key] = _value;
      }
    );

    RESULT({"a":true})
    .FN(
      {
        a: false
      },
      function(){
        this.a = true;
      }
    );

    RESULT({"a1":true,"a2":true})
    .FN(
      {
        a1: false,
        a2: false
      },
      function(){
        this.a1 = true;
        return true;
      },
      function(){
        this.a2 = true;
      }
    );

    RESULT({"aaa":1,"bbb":2})
    .FN(
      {},
      function(){
        return WHILE({aaa: 1, bbb: 2});
      },
      function(_value, _key){
        this[_key] = _value;
      }
    );

    RESULT({"aaa":1,"bbb":2})
    .FN(
      {},
      WHILE({aaa: 1, bbb: 2}),
      function(_value, _key){
        this[_key] = _value;
      }
    );

    RESULT({"0":"aaa","1":"bbb","a":["aaa","bbb"],"c":"ccc"})
    .FN(
      {},
      WHILE({a: ['aaa', 'bbb'], c: 'ccc'}),
      function(_value, _key){
        this[_key] = _value;
      }
    );

    // 안내 문구

    RESULT({})
    .that({})
    .FN(
      '등록1'
    );

    RESULT("FN을 사용할수있도록 메뉴얼을 제공")
    .FN();

    RESULT({"a":"미등록 실행(this 사용)"})
    .FN(
      '등록',
      {},
      function(){
        this.a = '미등록 실행(this 사용)';
      }
    );

    RESULT("FN$에 미리 셋팅 되어진 FN 사용하기 오류 메시지")
    .FN(
      '미리 셋팅되어진 FN이 없는경우',
      {}
    );

    RESULT({})
    .FN(
      {},
      function(){
        return [1, 2, 3];
      }
    );

    RESULT({})
    .FN(
      {},
      WHILE({})
    );

    // */

    eval(END());


  }


})(window, document);
