import { browserHistory } from 'react-router'
import { Saga, takeEvery } from 'redux-saga'
import { call, put } from 'redux-saga/effects'

import { Actions } from '../actions/index'
import auth from '../auth'
import config from '../config'
import { getMockPrivateKey } from '../mockKey'

const LOCALSTORAGE_SESSION = 'session';

async function requestIdFromAuth() {
  return await auth.getRequestIdForLogin()
}

async function bindAuthResponse(request: any) {
  const data = (await auth.onResponse(request.id) as any).signatures[0];
  return {
    publicKey: data.publicKey,
    token: { ...data, message: data.message }
  }
}

function* loginButtonClickedAction(action: any) {
  yield put({ type: Actions.loginModalShow });
  const requestId = yield call(requestIdFromAuth);
  yield put({ type: Actions.loginIdReceived, payload: requestId });
  const response = yield call(bindAuthResponse, requestId);
  yield put({ type: Actions.loginResponse, payload: response })
}

function* logoutButtonClickedAction(action: any) {
  yield put({ type: Actions.logoutRequested });
  localStorage.removeItem(LOCALSTORAGE_SESSION);
  browserHistory.push('/');
}

function* loginResponseAction(action: any) {
  yield put({ type: Actions.loginModalHide });

  localStorage.setItem(LOCALSTORAGE_SESSION, JSON.stringify(action.payload));
  yield put({ type: Actions.loginSuccess, token: action.payload });

  yield put({ type: Actions.fetchProfileData, profilePublicKey: action.payload.publicKey });
  browserHistory.push('/'); // TODO: redirect to login_success
}

function* mockLoginHit(action: any) {
  yield call(fetch, config.api.mockApp + '/' + getMockPrivateKey() + '/' + action.payload, { method: 'POST' })
}

function* loginModalDisposeRequestedAction(action: any) {
  yield put({ type: Actions.loginModalHide });
}

function sessionSaga(): Saga {
  return function*() {
    const session = localStorage.getItem(LOCALSTORAGE_SESSION);

    if (session) {
      const token = JSON.parse(session);
      yield put({ type: Actions.loginSuccess, token });
      yield put({ type: Actions.fetchProfileData, profilePublicKey: token.publicKey });
    }

    yield takeEvery(Actions.loginButtonClicked, loginButtonClickedAction);
    yield takeEvery(Actions.logoutButtonClicked, logoutButtonClickedAction);
    yield takeEvery(Actions.loginModalDisposeRequested, loginModalDisposeRequestedAction);
    yield takeEvery(Actions.loginResponse, loginResponseAction);
    yield takeEvery(Actions.mockLoginRequest, mockLoginHit);
  }
}

export default sessionSaga;