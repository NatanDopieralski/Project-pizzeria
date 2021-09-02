/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
import {templates} from '/js/settings.js';

class Home {
  constructor(element){
    const thisHome = this;

    thisHome.clickedTable = [];

    thisHome.render(element);
    thisHome.initWidgets();
  }

  render(element){
    const thisHome = this;

    const generatedHTML = templates.pageHomeWidget();

    thisHome.dom = {};

    thisHome.dom.wrapper = element;

    thisHome.dom.wrapper.innerHTML = generatedHTML;
  }

  initWidgets(){
    const elem = document.querySelector('.main-carousel');
    const flkty = new Flickity( elem, {
      cellAlign: 'left',
      contain: true,
      autoPlay: 3000,
      prevNextButtons: false
    });
  }
}

export default Home;