/**
 * Calendar - displays a calendar of the current month. Dates appear links if there are posts for that day.
 */

(function ($) {

  const aCalendar = function (language, options, object) {
    const currentPathSplit = window.location.pathname.split('/')
    const now = new Date();
    const nDay = now.getDate();
    const nMonth = now.getMonth();
    const nYear = now.getFullYear();
    const dMonth = currentPathSplit.length !== 2 ? parseInt(currentPathSplit[2]) - 1 : nMonth;
    const dYear = currentPathSplit.length !== 2 ? parseInt(currentPathSplit[1]) : nYear;
    const instance = object;
    let allPosts = null;
    let months = null;
    let activeMonthIndex = -1;
    let isProgrammaticScrolling = false;
    let backgroundObserver = null;
    let currentLanguage = 'en';

    initLanguage(language);

    const settings = $.extend({}, $.fn.aCalendar.defaults, typeof calLanguages === 'undefined' ? {} : calLanguages[currentLanguage], options);

    if (settings.root[0] !== '/') {
      settings.root = '/' + settings.root;
    }

    if (settings.root[settings.root.length - 1] !== '/') {
      settings.root += '/';
    }

    /**
     * Initial language.
     */
    function initLanguage(key) {
      if (key && typeof calLanguages !== 'undefined' && calLanguages[key]) {
        currentLanguage = key;
      }
    }

    /**
     * Load current month's posts.
     */
    function loadPosts() {
      if (settings.single) {
        loadAllPosts();
      } else {
        loadPostsByMonth();
      }
    }

    /**
     * Load all month's posts.
     */
    function loadAllPosts() {
      if (settings.url == null || settings.url === '') {
        return;
      }
      if (allPosts !== null) {
        return;
      }
      $.ajax({
        url: settings.url,
        async: false,
        success: function (data) {
          allPosts = data;
          initMonthsDayOne(Object.keys(allPosts));
        }
      });
    }

    /**
     * Load posts by the month.
     */
    function loadPostsByMonth() {
      if (months === null) {
        $.ajax({
          url: settings.root + 'list.json',
          async: false,
          success: function (data) {
            initMonthsDayOne(data);
          }
        });
      }

      // parse()
      if (settings.single) {
        $.ajax({
          url: settings.root + dYear + '-' + (dMonth + 1) + '.json',
          async: false,
          success: function (data) {
            allPosts = data;
          }
        });
      }
    }

    function getPostsByMonth(year, month) {
      if (!allPosts) {
        return []
      }
      return allPosts[year + '-' + (month + 1)] || [];
    }


    /**
     * Initial months array.
     */
    function initMonthsDayOne(array) {
      if (!array || array.length === 0) {
        months = [];
        return;
      }

      const first = array[0].split('-');
      const last = array[array.length - 1].split('-');

      const startDate = new Date(Date.UTC(+first[0], +first[1] - 1));
      const endDate = new Date(Date.UTC(+last[0], +last[1] - 1));

      months = [];

      for (
        let date = new Date(startDate);
        date <= endDate;
        date.setUTCMonth(date.getUTCMonth() + 1)
      ) {
        months.push({
          year: date.getUTCFullYear(),
          month: date.getUTCMonth()
        });
      }
    }

    /**
     * Format date object.
     */
    function simpleDateFormat(date, fmt) {
      const o = {
        'LMM+': settings.months[date.getMonth()],
        'MM+': date.getMonth() + 1
      };

      if (/(y+)/.test(fmt)) {
        fmt = fmt.replace(RegExp.$1, (date.getFullYear() + '').substr(4 - RegExp.$1.length));
      }

      for (const k in o) {
        if (new RegExp('(' + k + ')').test(fmt)) {
          fmt = fmt.replace(RegExp.$1, (k === 'LMM+') ? (o[k]) : (('00' + o[k]).substr(('' + o[k]).length)));
        }
      }

      return fmt;
    }

    /**
     * Calculate all month
     */
    function monthDiff(start, end) {
      const [sy, sm] = start.split("-").map(Number);
      const [ey, em] = end.split("-").map(Number);

      return (ey * 12 + em) - (sy * 12 + sm) + 1;
    }

    function renderMonth(year, month, posts, index) {
      const date = new Date(year, month, 1);
      const monthBox = $('<div/>').addClass('calendar-single-month')
        .attr('data-month-index', index);
      // .css('top', settings.singleMonthHeight * (index - 1) + 'px');
      const body = $('<div/>').addClass('calendar-month-body')
        .attr('aria-hidden', 'true')
        .css('opacity', '1');
      const monthAndName = $('<div/>').addClass('calendar-month-and-name');
      const title = $('<h3/>').addClass('calendar-monthname')
        .text(simpleDateFormat(date, settings.dayoneTitleFormat || settings.titleFormat));
      const grid = $('<div/>').addClass('calendar-month');

      monthAndName.append(title);
      monthAndName.append(grid);
      body.append(monthAndName)
      monthBox.append(body);

      renderMonthDays(grid, year, month, posts);
      return monthBox;
    }

    function renderMonthDays(container, year, month, posts) {
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);

      let start = firstDay.getDay();
      start = (start + 6) % 7;

      const daysInMonth = lastDay.getDate();
      const postsByDay = {};

      for (let i = 0; i < posts.length; i++) {
        const post = posts[i];
        const day = new Date(Date.parse(post.date)).getDate();

        if (!postsByDay[day]) {
          postsByDay[day] = [];
        }

        postsByDay[day].push(post);
      }

      // empty-place-holder
      for (let i = 0; i < start; i++) {
        container.append($('<div/>').addClass('empty-day-placeholder'));
      }

      for (let day = 1; day <= daysInMonth; day++) {
        container.append(renderDay(year, month, day, postsByDay[day]));
      }

      const total = start + daysInMonth;
      const reaming = (7 - total % 7) % 7;

      for (let i = 0; i < reaming; i++) {
        container.append($('<div/>').addClass('empty-day-placeholder'));
      }
    }

    function renderDay(year, month, day, posts) {
      const button = $('<button/>').addClass('one-day-entry')
        .attr('id', 'date-' + year + '-' + (month + 1) + '-' + day);

      const text = $('<span/>').addClass('one-day-text').text(day);

      if (day === nDay && month === nMonth && year === nYear) {
        button.addClass('calendar-today');
      }
      if (posts && posts.length) {
        const post = posts[0];
        text.attr('title', post.title);
        button.attr('data-link', post.link);
        button.append($('<span/>')
          .addClass('one-day-bg-color')
          .css('opacity', '1'));
        if (post.background) {
          button.append($('<span/>')
            .addClass('one-day-bg-color one-day-background')
            .css('opacity', '1')
            .attr('data-background', settings.ossHost + post.background)
          );
          text.attr('has-background', '');
        }
      } else {
        text.attr('empty-entry', '')
      }
      button.append(text)
      return button;
    }

    function renderMonthIndex() {
      const indexBox = $('<div/>').addClass('calendar-month-index');
      const indexInner = $('<div/>').addClass('calendar-month-index-inner');

      let currentYear = null;
      months.forEach(function (item, index) {
        if (item.year !== currentYear) {
          currentYear = item.year;

          indexInner.append(
            $('<div/>')
              .addClass('calendar-index-year')
              .text(item.year + ' 年')
          );
        }

        const monthButton = $('<button/>').addClass('calendar-index-month')
          .attr('type', 'button')
          .attr('data-month-index', index);

        $('<span/>').addClass('calendar-index-month-number')
          .text(item.month + 1)
          .appendTo(monthButton);

        $('<span/>').addClass('calendar-index-month-unit')
          .text('月')
          .appendTo(monthButton);

        indexInner.append(monthButton);
      });

      indexBox.append(indexInner);

      instance.append(indexBox);

      indexBox.on('click', '.calendar-index-month', function () {
        const index = Number($(this).attr('data-month-index'));

        scrollToMonth(index);
      })

      indexBox.on('mouseenter', function () {
        if (activeMonthIndex === -1) {
          return;
        }

        const inner = $(this).find('.calendar-month-index-inner')[0];
        const active = $(this).find('.calendar-index-month').eq(activeMonthIndex)[0];

        if (!inner || !active) {
          return;
        }

        const targetTop = active.offsetTop - (inner.clientHeight - active.offsetHeight) / 2;
        inner.scrollTo({
          top: Math.max(0, targetTop),
          behavior: 'smooth',
        });
      });

      return indexBox;
    }

    function setActiveMonth(index) {
      if (index === activeMonthIndex) {
        return;
      }

      if (activeMonthIndex !== -1) {
        instance.find('.calendar-index-month')
          .eq(activeMonthIndex)
          .removeClass('active');
      }

      instance.find('.calendar-index-month')
        .eq(index)
        .addClass('active');

      activeMonthIndex = index;
    }

    function observeMonths() {
      const root = instance.find('.calendar-body')[0];

      if (!root) {
        return;
      }

      const observer = new IntersectionObserver(
        function (entries) {
          let visibleIndex = -1;
          let visibleRatio = 0;

          entries.forEach(function (entry) {
            if (!entry.isIntersecting) {
              return;
            }

            const index = Number(entry.target.dataset.monthIndex);

            if (entry.intersectionRatio > visibleRatio) {
              visibleRatio = entry.intersectionRatio;
              visibleIndex = index;
            }
          });

          if (visibleIndex !== -1) {
            setActiveMonth(visibleIndex);
          }
        },
        {
          root: root,
          threshold: [0.25, 0.5, 0.75]
        }
      );

      root.querySelectorAll('.calendar-single-month').forEach(function (element) {
        observer.observe(element);
      });
    }

    /**
     * Draw calendar.
     *
     */
    function draw() {
      loadPosts();

      // renderHeader
      let dayOfWeek = settings.weekOffset
      const dayOfWeekText = settings.dayOfWeekShort;
      const daysOfWeekHeader = $("<div/>").addClass("daysOfWeek");
      for (let i = 0; i < 7; i++) {
        if (dayOfWeek > 6) {
          dayOfWeek = 0
        }
        daysOfWeekHeader.append($("<div/>").text(dayOfWeekText[dayOfWeek]));
        dayOfWeek++;
      }
      instance.prepend(daysOfWeekHeader);

      initCalendarToggle()

      const calendarBox = instance.find("#calendar-box").css('height', 5 * settings.singleMonthHeight + 'px',);
      calendarBox.empty();

      const monthsContainer = $('<div/>').addClass('calendar-months');

      //todo 限制DOM渲染，virtualization
      months.forEach(function (item, index) {
        monthsContainer.append(
          renderMonth(
            item.year,
            item.month,
            getPostsByMonth(item.year, item.month) || [],
            index
          )
        );
      })

      calendarBox.append(monthsContainer);
      renderMonthIndex();
      observeMonths();
      lazyLoadBackgrounds();
      scrollToCurrentMonth();
      calendarBox.on('click', '.one-day-entry[data-link]', function () {
        window.location.href = $(this).data('link');
      });
    }

    return draw();

    function scrollToCurrentMonth() {
      const index = months.findIndex(function (item) {
        return (
          item.year === dYear &&
          item.month === dMonth
        );
      });

      if (index === -1) {
        return;
      }

      // instance.find('.calendar-body').scrollTop((index * settings.singleMonthHeight));
      scrollToMonth(index, 'auto');
    }

    function scrollToMonth(index, behavior = 'smooth') {
      if (index < 0 || index >= months.length) {
        return;
      }
      const calendarBody = instance.find(".calendar-body")[0];
      const monthBox = instance.find(".calendar-single-month").eq(index)[0];

      if (!calendarBody || !monthBox) {
        return;
      }

      if (behavior === 'smooth') {
        isProgrammaticScrolling = true;

        calendarBody.scrollTo({
          top: monthBox.offsetTop,
          behavior: 'smooth'
        });

        waitForScrollEnd(calendarBody, function () {
            isProgrammaticScrolling = false;
            loadMonthBackgrounds(index);
          }
        );

        return;
      }

      calendarBody.scrollTo({
        top: monthBox.offsetTop,
        behavior: 'auto'
      });

      loadMonthBackgrounds(index);
    }

    function waitForScrollEnd(element, callback) {
      let finished = false;
      let scrollTimer = null;
      let maxTimer = null;

      function cleanup() {
        element.removeEventListener('scrollend', done);
        element.removeEventListener('scroll', onScroll);

        clearTimeout(scrollTimer);
        clearTimeout(maxTimer);
      }

      function done() {
        if (finished) {
          return;
        }

        finished = true;
        cleanup();

        callback();
      }

      function onScroll() {
        clearTimeout(scrollTimer);

        scrollTimer = setTimeout(function () {
          done();
        }, 80);
      }

      element.addEventListener('scrollend', done, {once: true});

      element.addEventListener('scroll', onScroll);

      // fallback
      maxTimer = setTimeout(function () {
        done();
      }, 1000);
    }

    function lazyLoadBackgrounds() {
      const root = instance.find(".calendar-body")[0]

      if (!root) {
        return;
      }

      backgroundObserver = new IntersectionObserver(function (entries) {

        if (isProgrammaticScrolling) {
          return;
        }

        entries.forEach(function (entry) {
          if (!entry.isIntersecting) {
            return;
          }

          loadBackground(entry.target)
        });
      }, {
        root: root,
        rootMargin: '0px 0px'
      });

      root.querySelectorAll(
        '.one-day-background[data-background]'
      ).forEach(function (element) {
        backgroundObserver.observe(element);
      });
    }

    function loadBackground(element) {
      const background = element.dataset.background;

      if (background) {
        element.style.backgroundImage =
          `url("${background}")`;

        element.removeAttribute('data-background');

        if (backgroundObserver) {
          backgroundObserver.unobserve(element);
        }
      }
    }

    function loadMonthBackgrounds(index) {
      const month = instance.find('.calendar-single-month').eq(index);

      if (!month.length) {
        return;
      }

      month.find('.one-day-background[data-background]')
        .each(function () {
          loadBackground(this);
        });
    }

    function initCalendarToggle() {
      let toggle = $('#fullscreen-article-button');

      if (toggle.length === 0) {
        toggle = $(
          '<button id="fullscreen-article-button" type="button">' +
          '<i class="iconfont icon-fullscreen"></i>' +
          '</button>'
        );

        $('main').append(toggle);
      }

      const board = $('#board');

      if (board.length === 0) {
        return;
      }

      let posDisplay = false;
      let scrollDisplay = false;

      const setButtonPos = function () {

        const boardRight = board[0].getClientRects()[0].right;
        const bodyWidth = document.body.offsetWidth;
        const right = bodyWidth - boardRight;

        posDisplay = right >= 50;
        const visible = posDisplay && scrollDisplay;

        toggle.css({
          'bottom': visible ? '70px' : '-110px',
          'right': right - 64 + 'px'
        });
      };

      setButtonPos();

      jQuery(window).resize(setButtonPos);

      const headerHeight = board.offset().top;

      Fluid.utils.listenScroll(function () {

        var scrollHeight = document.body.scrollTop + document.documentElement.scrollTop;

        scrollDisplay = scrollHeight >= headerHeight;

        setButtonPos();
      });

      toggle.on('click', function () {
        const layout = jQuery('.side-col').closest('.row');

        layout.toggleClass('fullscreen-article');

        const fullscreen = layout.hasClass('fullscreen-article');

        toggle.find('i')
          .toggleClass('icon-fullscreen', !fullscreen)
          .toggleClass('icon-fullscreen-exit', fullscreen);
      });
    }
  };

  $.fn.aCalendar = function (Lang, oInit) {
    return this.each(function () {
      return aCalendar(Lang, oInit, $(this));
    });
  };


  // plugin defaults
  $.fn.aCalendar.defaults = {
    months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    dayOfWeekShort: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
    dayOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    postsMonthTip: 'Posts published in LMM yyyy',
    titleFormat: 'yyyy LMM',
    dayoneTitleFormat: 'LMM yyyy',
    titleLinkFormat: '/archives/yyyy/MM/',
    headArrows: {previous: '<span class="cal-prev"></span>', next: '<span class="cal-next"></span>'},
    footArrows: {previous: '« ', next: ' »'},
    weekOffset: 1,
    singleMonthHeight: 332,
    single: true,
    root: '/calendar/',
    url: '/calendar.json',
    ossHost: 'https://files.yaohub.com'
  };

}(jQuery));
