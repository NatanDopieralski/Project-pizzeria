import {select, templates, settings} from '/js/settings.js';
import utils from '../utils.js';
import AmountWidget from './AmountWidget.js';
import HourPicker from './HourPicker.js';
import DatePicker from './DatePicker.js';
import { classNames } from '../settings.js';

class Booking {
  constructor(element){
    const thisBooking = this;

    thisBooking.clickedTable = [];

    thisBooking.render(element);
    thisBooking.initWidgets();
    thisBooking.getData();
    thisBooking.initTables();
  }

  getData(){
    const thisBooking = this;

    const startDateParams = settings.db.dateStartParamKey + '=' + utils.dateToStr(thisBooking.datePicker.minDate);
    const endDateParams = settings.db.dateEndParamKey + '=' + utils.dateToStr(thisBooking.datePicker.maxDate);

    const params = {
      booking: [
        startDateParams,
        endDateParams,
      ],
      eventsCurrent: [
        settings.db.notRepeatParam,
        startDateParams,
        endDateParams,
      ],
      eventsRepeat: [
        settings.db.repeatParam,
        endDateParams,
      ],
    };

    //console.log('getData params', params);

    const urls = {
      booking:       settings.db.url + '/' + settings.db.booking
                                     + '?' + params.booking.join('&'),
      eventsCurrent: settings.db.url + '/' + settings.db.event
                                     + '?' + params.eventsCurrent.join('&'),
      eventsRepeat:  settings.db.url + '/' + settings.db.event
                                     + '?' + params.eventsRepeat.join('&'),
    };

    Promise.all([
      fetch(urls.booking),
      fetch(urls.eventsCurrent),
      fetch(urls.eventsRepeat),
    ])
      .then(function(allResponses){
        const bookingsResponse = allResponses[0];
        const eventsCurrentResponse = allResponses[1];
        const eventsRepeatResponse = allResponses[2];
        return Promise.all([
          bookingsResponse.json(),
          eventsCurrentResponse.json(),
          eventsRepeatResponse.json(),
        ]);
      })
      .then(function([bookings, eventsCurrent, eventsRepeat]){
        thisBooking.parseData(bookings, eventsCurrent, eventsRepeat);
      });
  }

  parseData(bookings, eventsCurrent, eventsRepeat){
    const thisBooking = this;

    thisBooking.booked = {};

    for(let item of eventsCurrent){
      thisBooking.makeBooked(item.date, item.hour, item.duration, item.table);
    }

    for(let item of bookings){
      thisBooking.makeBooked(item.date, item.hour, item.duration, item.table);
    }

    const minDate = thisBooking.datePicker.minDate;
    const maxDate = thisBooking.datePicker.maxDate;

    for(let item of eventsRepeat){
      if(item.repeat == 'daily'){
        for(let loopDate = minDate; loopDate <= maxDate; loopDate = utils.addDays(loopDate, 1)){
          thisBooking.makeBooked(utils.dateToStr(loopDate), item.hour, item.duration, item.table);
        }
      }
    }
    //console.log(thisBooking.booked);

    thisBooking.updateDOM();
  }

  makeBooked(date, hour, duration, table){
    const thisBooking = this;

    if(typeof thisBooking.booked[date] == 'undefined'){
      thisBooking.booked[date] = {};
    }

    const startHour = utils.hourToNumber(hour);

    for(let hourBlock = startHour; hourBlock < startHour + duration; hourBlock += 0.5){
      if(typeof thisBooking.booked[date][hourBlock] == 'undefined'){
        thisBooking.booked[date][hourBlock] = [];
      }
      thisBooking.booked[date][hourBlock].push(table);
    }
  }

  updateDOM(){
    const thisBooking = this;

    thisBooking.date = thisBooking.datePicker.value;
    thisBooking.hour = utils.hourToNumber(thisBooking.hourPicker.value);

    let allAvailable = false;

    if(
      typeof thisBooking.booked[thisBooking.date] == 'undefined'
      ||
      typeof thisBooking.booked[thisBooking.date][thisBooking.hour] == 'undefined'
    ){
      allAvailable = true;
    }

    for(let table of thisBooking.dom.tables){
      let tableId = table.getAttribute(settings.booking.tableIdAttribute);
      if(isNaN(tableId)){
        tableId = parseInt(tableId);
      }

      if(
        !allAvailable
        &&
        thisBooking.booked[thisBooking.date][thisBooking.hour].includes(tableId) > -1
      ){
        table.classList.add(classNames.booking.tableBooked);
      } else {
        table.classList.remove(classNames.booking.tableBooked);
      }
    }
  }

  render(element){
    const thisBooking = this;

    thisBooking.starters = [];

    const generatedHTML = templates.bookingWidget();

    thisBooking.dom = {};

    thisBooking.dom.wrapper = element;

    thisBooking.dom.wrapper.innerHTML = generatedHTML;
    thisBooking.dom.peopleAmount = thisBooking.dom.wrapper.querySelector(select.booking.peopleAmount);
    thisBooking.dom.hoursAmount = thisBooking.dom.wrapper.querySelector(select.booking.hoursAmount);
    thisBooking.dom.datePicker = thisBooking.dom.wrapper.querySelector(select.widgets.datePicker.wrapper);
    thisBooking.dom.hourPicker = thisBooking.dom.wrapper.querySelector(select.widgets.hourPicker.wrapper);
    thisBooking.dom.tables = thisBooking.dom.wrapper.querySelectorAll(select.booking.tables);
    thisBooking.dom.divTable = thisBooking.dom.wrapper.querySelectorAll(classNames.booking.table);
    thisBooking.dom.form = thisBooking.dom.wrapper.querySelector(select.booking.submitBookingForm);
    thisBooking.dom.address = thisBooking.dom.wrapper.querySelector(select.booking.address);
    thisBooking.dom.phone = thisBooking.dom.wrapper.querySelector(select.booking.phone);
    thisBooking.dom.hours = thisBooking.dom.wrapper.querySelector(select.booking.hours);
    thisBooking.dom.people = thisBooking.dom.wrapper.querySelector(select.booking.people);
    thisBooking.dom.water = thisBooking.dom.wrapper.querySelector(select.booking.water);
    thisBooking.dom.bread = thisBooking.dom.wrapper.querySelector(select.booking.bread);
  }

  initWidgets(){
    const thisBooking = this;

    thisBooking.peopleAmount = new AmountWidget(thisBooking.dom.peopleAmount);
    thisBooking.hoursAmount = new AmountWidget(thisBooking.dom.hoursAmount);
    thisBooking.datePicker = new DatePicker(thisBooking.dom.datePicker);
    thisBooking.hourPicker = new HourPicker(thisBooking.dom.hourPicker);

    thisBooking.dom.peopleAmount.addEventListener('updated', function(){
    });

    thisBooking.dom.hoursAmount.addEventListener('updated', function(){
    });

    thisBooking.dom.wrapper.addEventListener('updated', function(){
      thisBooking.updateDOM();
    });

    thisBooking.dom.form.addEventListener('submit', function(event){
      event.preventDefault();
      thisBooking.sendBookOrder();
    });

    thisBooking.dom.water.addEventListener('click', function(event){
      if(event.target.tagName == 'INPUT' && event.target.type == 'checkbox' && event.target.value == 'water' && event.target.checked){
        thisBooking.starters.push(thisBooking.dom.water.value);
      } else {
        thisBooking.starters = thisBooking.starters.filter((elem) => elem !== thisBooking.dom.water.value);
      }
    });

    thisBooking.dom.bread.addEventListener('click', function(event){
      if(event.target.tagName == 'INPUT' && event.target.type == 'checkbox' && event.target.value == 'bread' && event.target.checked){
        thisBooking.starters.push(thisBooking.dom.bread.value);
      } else {
        thisBooking.starters = thisBooking.starters.filter((elem) => elem !== thisBooking.dom.bread.value);
      }
    });

    thisBooking.dom.hoursAmount.addEventListener('click', function(){
      thisBooking.resetTables();
      //console.log(thisBooking.starters);
    });

    thisBooking.dom.hourPicker.addEventListener('click', function(){
      thisBooking.resetTables();
      //console.log(thisBooking.starters);
    });

    thisBooking.dom.datePicker.addEventListener('click', function(){
      thisBooking.resetTables();
      //console.log(thisBooking.starters);
    });
  }

  initTables(){
    const thisBooking = this;

    for(let table of thisBooking.dom.divTable){
      table.addEventListener('click', function(event){
        event.preventDefault();

        const tableId = table.getAttribute('data-table');

        if(table.classList.contains('booked')){
          alert(`Ten stolik niestety jest już zajęty.`);
        } else { //chyba musi tak zostać :D kombinowałem na różne sposoby ale bez drugiego ifa poza for nie chce działać poprawnie
          for(let table of thisBooking.dom.divTable){
            if(event.target != table ){
              table.classList.remove('selected');
              thisBooking.tableId = tableId;
            }
          }
          if(!table.classList.contains('selected')){
            table.classList.add('selected');
          } else {
            thisBooking.resetTables();
          }
          console.log(thisBooking.tableId);
        }
      });
    }
  }

  resetTables(){
    const thisBooking = this;

    for(let table of thisBooking.dom.divTable){
      table.classList.remove('selected');
      thisBooking.tableId = null;
    }

  }

  sendBookOrder(){
    const thisBooking = this;

    const url = settings.db.url + '/' + settings.db.booking;

    const payload = {
      date: thisBooking.date,
      hour: utils.numberToHour(thisBooking.hour),
      table: thisBooking.tableId,
      duration: thisBooking.dom.hours.value,
      ppl: thisBooking.dom.people.value,
      starters: thisBooking.starters,
      phone: thisBooking.dom.phone.value,
      address: thisBooking.dom.address.value,
    };

    console.log(payload);

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    };

    fetch(url, options)
      .then(function(response){
        return response.json();
      }).then(function(){
        thisBooking.makeBooked(payload.date, payload.hour, payload.duration, payload.table);
      });
  }
}

export default Booking;