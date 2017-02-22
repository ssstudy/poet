export namespace Actions {
  export const navbarSearchClick = 'navbar search click';
  export const navbarSearchChange = 'navbar search change';
  export const fetchRequest = 'fetch requested';
  export const claimsSubmitRequested = 'claims submit requested';
  export const claimsModalDismissRequested = 'dismiss work modal';

  export const fetchResponseSuccess = 'fetch response success';
  export const fetchResponseError = 'fetch response error';

  export const claimsSigned = 'claim signed';
  export const claimsSubmitedSuccess = 'create claim success';
  export const claimsSubmitting = 'submitting claims';

  export const signClaimsModalShow = 'show sign claims modal';
  export const signClaimsModalHide = 'hide sign claims modal';

  export const updatingProfile = 'updating profile';
  export const profileUpdated = 'profile updated successfully';
  export const updateProfileRequested = 'profile update requested';

  export const unrecognizedSocketMessage = 'unrecognized socket message';

  export const claimsResponse = 'claim response for signature';
  export const claimIdReceived = 'request id for authorizing claim received';
  export const fakeClaimSign = 'fake sign claim requested';

  export const blockInfoReceived = 'block info received';

  export const signTxSubmitRequested = 'sign tx submit requested';
  export const signTxModalDismissRequested = 'sign tx dismiss modal received';
  export const fakeTxSign = 'fake sign requested';
  export const txSubmittedSuccess = 'tx submitted';
  export const signTxIdReceived = 'sign tx id received';
  export const signTxModalHide = 'sign tx modal hide';
  export const signTxModalShow = 'sign tx modal show';
  export const submittingTx = 'submitting tx';

  export const fetchProfileData = 'fetch profile data';
  export const profileDataFetched = 'profile data fetched';

  export const payForLicenseRequested = 'pay for license';
  export const licensePaid = 'license paid';

  export const withdrawalRequested = 'withdrawal started';
  export const withdrawalDone = 'withdrawal done';

  export const noBalanceAvailable = 'no balance available';
  export const transferRequested = 'transfer work requested';

  export const fakeTransferSign = 'fake transfer sign requested';
  export const setTransferTarget = 'transfer work target set';
  export const transferIdReceived = 'transfer id to sign received';

  export const transferSuccess = 'transfer success';

  export const transferModalShow = 'transfer modal show';
  export const transferModalHide = 'transfer modal hide';
  export const transferModalDismissRequested = 'transfer modal dismiss requested';
  export const transferDismissed = 'transfer work modal dismissed';

  export namespace Session {
    export const MockLoginRequest = 'mock login server requested';
    export const LoginButtonClicked = 'login button clicked';
    export const LogoutButtonClicked = 'logout button clicked';
    export const LoginResponse = 'login response';
    export const LoginSuccess = 'login success';
    export const LogoutRequested = 'logout requested';
    export const LoginIdReceived = 'login ID received';
  }

  export namespace Modals {
    export namespace Login {
      export const Show = 'login modal open';
      export const Hide = 'login modal close';
    }
    export namespace PurchaseLicense {
      export const Show = 'purchase license modal show';
      export const Accept = 'purchase license modal accept';
      export const Cancel = 'purchase license modal cancel';
    }
  }
}