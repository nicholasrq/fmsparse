'use strict';
console.log('Start')
const request = require('request'),
      cheerio = require('cheerio'),
      moment  = require('moment'),
      colors  = require('colors');

const url     = 'https://guvm.mvd.ru/services/appointment/appointment_schedule_view/?site_id=2&select=&district_id=&select=&document_id=365&select=&operation_id=165&select=';

const clear   = function(){
  var i,lines;
  var stdout = "\x1B[2J";
  stdout += "\x1B[0f";
  
  process.stdout.write(stdout);
}

const loadSchedule = (function(){
  return new Promise(resolve => {
    
    const today       = moment().add({days: 1}),
          maxDate     = moment().add({days: 17});
          
    request.get(url, function(err, response){
      const $       = cheerio.load(`<div>${response.body}</div>`),
            content = cheerio($('script')[1]).html().split("\n").map(row => row.trim()),
            object  = {}
      
      for(let row of content){
        let parsed = row.match(/document\.([^\s]+)([\s=]+)([^;]+);/i)
        if(parsed != null){
          let key = parsed[1].split('_').slice(0,2).join('_')
          object[key] = JSON.parse(parsed[3])
        }
      }

      let iterableDate = today.clone()
      while(iterableDate.toDate() <= maxDate.toDate()){
        let date          = iterableDate.clone().toDate(),
            formatted     = iterableDate.format('DD.MM.YYYY'),
            timestamp     = date.getTime(),
            scheduleEdge  = iterableDate.clone().endOf('year').startOf('day').toDate().getTime(),
            emptyDays     = object.app_emptydays,
            dateNow       = timestamp / 1000,
            dow           = date.getDay(),
            dateKey       = '';

        for(let key in emptyDays) {
            let dateTo    = emptyDays[key]['to'] + 7200,
                dateFrom  = parseInt(key) - 7200;

            if(dateFrom <= dateNow && dateTo >= dateNow) {
                dateKey = key;
                break;
            }
        }
        iterableDate.add({days: 1})
        
        if(!dateKey){
          console.log(`${formatted} – Время недоступно для записи`.gray)
          continue
        }
        
        if(timestamp <= new Date().getTime() || timestamp > scheduleEdge){
          console.log(`${formatted} – Время недоступно для записи`.gray)
          continue
        }
        
        if(date.getTime() > maxDate.toDate().getTime()){
          console.log(`${formatted} – Время недоступно для записи`.gray)
          continue
        }
        
        if (object.app_emptydays[dateKey]['data'].indexOf(dow) != -1){
          console.log(`${formatted} – Время недоступно для записи`.gray)
          continue
        }
        
        if (object.app_playdays[dateKey]['data'].indexOf(formatted) != -1){
          console.log(`${formatted} – Время недоступно для записи`.gray)
          continue
        }
        
        if (object.app_busydays[dateKey]['data'].indexOf(formatted) != -1){
          console.log(`${formatted} – Время для записи исчерпано`.red)
          continue
        }
        
        if (object.app_shortdays[dateKey]['data'].indexOf(formatted) != -1){
          console.log(`${formatted} – Короткий день`.orange)
          continue
        }

        console.log(`${formatted} – Время доступно для записи`.green)
      }
      resolve()
    })
  })
})      

const updateSchedule = function(){
  clear()
  console.log("Актуальное расписание на запись:")
  loadSchedule().then(()=> {
    setTimeout(updateSchedule, 1 * 60 * 1000)
  })
}

updateSchedule()
