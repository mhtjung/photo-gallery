class Application {
  constructor() {
    this.photoData = null;
    this.templates = null;

    this.currentPhotoId = null;
    this.currentPhoto = 0;

    this.slidesContainer = document.querySelector('#slides');
    this.commentsContainer = document.querySelector('#comments')
    this.newCommentForm = this.commentsContainer.querySelector('form');
    this.newCommentFormPhotoId = this.newCommentForm.querySelector('input[name=photo_id');
    this.registerTemplates();
    this.renderPage();
    this.bindEvents();
  }

  bindEvents() {
    document.querySelector('#slideshow ul').addEventListener('click', this.handleSlide.bind(this));
    this.newCommentForm.addEventListener('submit', this.handleNewComment.bind(this));
  }

  bindButtonEvents() {
    this.likeBtn = document.querySelector('a.button.like');
    this.favBtn = document.querySelector('a.button.favorite');

    this.likeBtn.addEventListener('click', this.handleLike.bind(this));
    this.favBtn.addEventListener('click', this.handleFavorite.bind(this));
  }

  async handleNewComment(event) {
    event.preventDefault();
    const formData = new FormData(this.newCommentForm);
    const urlString = new URLSearchParams(formData).toString();
    const response = await this.makePostRequest('/comments/new', urlString);
    const newCommentHTMl = this.templates.commentScript(JSON.parse(response));
    this.commentsContainer.querySelector('ul').insertAdjacentHTML('beforeend', newCommentHTMl);
    this.newCommentForm.reset();
  }

  async handleLike(event) {
    event.preventDefault(); 
    const payload = `photo_id=${this.currentPhotoId}`
    const response = await this.makePostRequest('/photos/like', payload);
    let newTotal = JSON.parse(response).total;
    this.photoData[this.currentPhoto].likes = newTotal;
    this.renderPhotoInfo();
  }

  async handleFavorite(event) {
    event.preventDefault();
    const payload = `photo_id=${this.currentPhotoId}`
    const response = await this.makePostRequest('/photos/favorite', payload);
    let newTotal = JSON.parse(response).total;
    this.photoData[this.currentPhoto].favorites = newTotal;
    this.renderPhotoInfo();
  }

  makePostRequest(url, payload) {
    return new Promise((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.open('POST', url)
      request.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
      request.onload = () => {
        if (request.status >= 200 && request.status <= 300) {
          resolve(request.response)
        } else {
          reject({
            message: request.response,
            status: request.status,
            statusText: request.statusText,
          })
        }
      };

      request.onerror = () => {
        reject({
          message: request.response,
          status: request.status,
          statusText: request.statusText,
        })
      };
      request.send(payload);
    })
  }

  handleSlide(event) {
    event.preventDefault();
    if (event.target.tagName !== 'A') { return }
    if (Array.from(event.target.classList).includes('prev')) {
      this.cyclePhotoIdx(false);
    } else {
      this.cyclePhotoIdx();
    }
    const slides = Array.from(this.slidesContainer.querySelectorAll('figure'));
    slides.forEach(fig => {
      if (fig.dataset.id == this.currentPhotoId) {
        fig.classList.remove('hide');
        fig.classList.add('show');
      } else {
        fig.classList.remove('show');
        fig.classList.add('hide');
      }
    });
    this.renderPhotoInfo();
    this.renderComments();
  }

  cyclePhotoIdx(next = true) {
    if (next) {
      if (this.currentPhoto === 2) {
        this.currentPhoto = 0;
      } else {
        this.currentPhoto += 1;
      }
    } else {
      if (this.currentPhoto === 0) {
        this.currentPhoto = 2;
      } else {
        this.currentPhoto -= 1;
      }
    }
    this.currentPhotoId = this.photoData[this.currentPhoto].id;
    this.newCommentFormPhotoId.value = this.currentPhotoId;
  }

  renderPhotoInfo() {
    let photo = this.photoData[this.currentPhoto]
    let header = document.querySelector('section > header');
    this.clearContents(header);
    let html = this.templates.photoInfoScript(photo);
    header.insertAdjacentHTML('beforeend', html)
    this.bindButtonEvents();
  }

  clearContents(element) {
    while (element.firstChild) { element.removeChild( element.firstChild )};
  }

  async renderComments() {
    const comments = await this.makeRequest('GET', `/comments?photo_id=${this.currentPhotoId}`);
    const html = this.templates.commentsScript({comments: JSON.parse(comments)});
    const commentsList = this.commentsContainer.querySelector('ul');
    this.clearContents(commentsList)
    commentsList.insertAdjacentHTML('afterbegin', html)
  } 

  async renderPage() {
    await this.getPhotoData();
    this.currentPhotoId = this.photoData[this.currentPhoto].id;
    this.newCommentFormPhotoId.value = this.currentPhotoId;
    this.renderPhotos();
    this.renderPhotoInfo(this.photoData[0].id);
    this.renderComments();
  }

  renderPhotos() {
    let html = this.templates.photoScript({photos: this.photoData})
    this.slidesContainer.insertAdjacentHTML('beforeend', html)
  }
  
  async getPhotoData() {
    let data = await this.makeRequest('GET', '/photos')
    this.photoData = JSON.parse(data);
    // return JSON.parse(data);
  }

  registerTemplates() {
    const photoTemplate = document.querySelector("#photos").innerHTML;
    const photoScript = Handlebars.compile(photoTemplate);
    
    const photoInfoTemplate = document.querySelector('#photo_information').innerHTML;
    const photoInfoScript = Handlebars.compile(photoInfoTemplate);

    const commentTemplate = document.querySelector('#photo_comment').innerHTML;
    const commentScript = Handlebars.compile(commentTemplate);
    Handlebars.registerPartial('comment', commentTemplate);

    const commentsTemplate = document.querySelector('#photo_comments').innerHTML;
    const commentsScript = Handlebars.compile(commentsTemplate);
  
    this.templates = {
      photoScript,
      photoInfoScript,
      commentScript,
      commentsScript,
    }
  }

  makeRequest(method, url, payload = null, responseType = 'json') {
    return new Promise((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.open(method, url);
      request.setRequestHeader('Content-Type', responseType);
      request.onload = () => {
        if (request.status >= 200 && request.status <= 300) {
          resolve(request.response)
        } else {
          reject({
            message: request.response,
            status: request.status,
            statusText: request.statusText,
          })
        }
      };

      request.onerror = () => {
        reject({
          message: request.response,
          status: request.status,
          statusText: request.statusText,
        })
      };

      request.send(payload);
    })
  }

  formDataToJSON(formData) {
    const data = {}
    formData.forEach((value, key) => 
     data[key] = encodeURI(value)
    );
    return data
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new Application();
})