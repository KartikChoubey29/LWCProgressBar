import { LightningElement, api, wire, track } from 'lwc';
import { getRecord, updateRecord } from 'lightning/uiRecordApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import STAGE_FIELD from '@salesforce/schema/Opportunity.StageName';
import ID_FIELD from '@salesforce/schema/Opportunity.Id';
import { getObjectInfo, getPicklistValuesByRecordType } from 'lightning/uiObjectInfoApi';
import Opportunity_OBJECT from '@salesforce/schema/Opportunity';
import { refreshApex } from '@salesforce/apex';
export default class LightningProgressBarIndicator extends LightningElement {
    @api recordId;
    @track currentStep;
    @track showPopup = false;
    @track selectedStep;
    @track showClosePopup = false;
    @track closeValue;
    @track isRequired = false;

    CloseOptions = [
        { label: 'Closed Won', value: 'Closed Won' },
        { label: 'Closed Lost', value: 'Closed Lost' },
    ];

    lossReasonOptions = [];
    competitorOptions = [];
    selectedLossReason;
    selectedCompetitor;

  @wire(getRecord, { recordId: '$recordId', fields: [STAGE_FIELD] })
    wiredRecord({ error, data }) {
        if (data) {
            console.log('OUTPUT : Record ID', this.recordId);
            this.currentStep = data.fields.StageName.value;
            console.log('Stage Current :--',this.currentStep);
        } else if (error) {
            this.showToast('Error', 'Error fetching opportunity stage', 'error');
        }
    }

// Compute the CSS classes for each stage dynamically
    get plannedStageClass() {
        if (this.currentStep === 'Planned Stage') {
            return 'slds-path__item slds-is-active slds-is-current';
        } else if (this.currentStep === 'Order Received' || this.currentStep === 'Closed Won') {
            return 'slds-path__item slds-is-complete';
        }
        return 'slds-path__item slds-is-incomplete';
    }

    get orderReceivedStageClass() {
        if (this.currentStep === 'Order Received') {
            return 'slds-path__item slds-is-active slds-is-current';
        } else if (this.currentStep === 'Closed Won') {
            return 'slds-path__item slds-is-complete';
        }
        return 'slds-path__item slds-is-incomplete';
    }


    // Determine if a stage is active for aria-selected
    get isPlannedStageActive() {
        return this.currentStep === 'Planned Stage';
    }

    get isOrderReceivedStageActive() {
        return this.currentStep === 'Order Received';
    }

    get isClosedStageActive() {
        return this.currentStep === 'Closed';
    }

    // Handle stage click and update the current step
    handleStepClick(event) {
        this.currentStep = event.currentTarget.dataset.value; // Get the clicked stage value
    }

  

    handleChange(event) {
        this.closeValue = event.detail.value;
        console.log('OUTPUT : ', this.closeValue);
        this.isRequired = this.closeValue === 'Closed Lost';
        
    }

        get getCloseStatus() {
            if (this.currentStep === 'Closed Lost') {
                return 'Closed Lost';
            } else if (this.currentStep === 'Closed Won') {
                return 'Closed Won';
            }
            return 'Closed';
        }
    
        get closedStageClass() {
            if (this.currentStep === 'Closed Lost') {
                return 'slds-path__item slds-is-lost slds-is-active slds-is-current';
            } else if (this.currentStep === 'Closed Won') {
                return 'slds-path__item slds-is-won slds-is-active slds-is-current';

            }
            return 'slds-path__item slds-is-incomplete';
        }

    handleLossReasonChange(event) {
        this.selectedLossReason = event.detail.value; // Update the selected loss reason
        console.log('Selected Loss Reason:', this.selectedLossReason);
    }

    handleCompetitorChange(event) {
        this.selectedCompetitor = event.detail.value; // Update the selected competitor
        console.log('Selected Competitor:', this.selectedCompetitor);
    }

    handleSubmit(event) {
        const fields = event.detail.fields || {};
        fields[ID_FIELD.fieldApiName] = this.recordId;
        fields.StageName = this.closeValue;

        // Fetch Loss Reason and Competitor values from combobox
        if (this.selectedLossReason) {
            fields['Loss_Reason__c'] = this.selectedLossReason;
        }
        if (this.selectedCompetitor) {
            fields['Competitor__c'] = this.selectedCompetitor;
        }

        const commentsField = this.template.querySelector('lightning-input-field[data-field="Loss_Comments__c"]');
        if (commentsField) {
            fields['Loss_Comments__c'] = commentsField.value;
        }

        console.log('Fields to Update:', fields);



        console.log('OUTPUT fields : ', fields);

        updateRecord({ fields })
            .then(() => {
                this.showToast('Success', 'Stage updated successfully', 'success');
                this.currentStep = this.closeValue;
                this.closePopup();
            })
            .catch(error => {
                this.showToast('Error', 'Error updating stage', 'error');
                console.error('OUTPUT : Error Message ', error);
            });
    }

    handleStepClick(event) {
        this.selectedStep = event.currentTarget.dataset.value;
        console.log('Selected Step:', this.selectedStep);
    }

    handleClick() {

        if (this.currentStep === this.selectedStep) {
            this.showToast('Info', 'Stage is already the current step', 'info');
        }

        if(this.selectedStep ==='Planned Stage')
        { 
            console.log('OUTPUT  Planned Stage: ',this.currentStep);
        this.updateStage(this.selectedStep);
        }
        
         else if (this.selectedStep === 'Order Received') {
            this.showPopup = true;
        } else if (this.selectedStep === 'Closed') {
            
            this.showClosePopup = true;
        }
    }

    closePopup() {
        this.showPopup = false;
        this.showClosePopup = false;
    }

    confirmStage() {
      
    const inputField = this.template.querySelector('lightning-input[data-id="purchaseOrderInput"]');

    if (!inputField.value) {
    
        inputField.setCustomValidity('This field is required');
         inputField.reportValidity();
    } else {
       
        inputField.setCustomValidity('');
        inputField.reportValidity();
         console.log('Customer Purchase Order Number:', inputField.value);
          this.updateStage(this.selectedStep);
        this.closePopup();
    }
      
    }

    showToast(title, message, variant) {
        const event = new ShowToastEvent({
            title,
            message,
            variant,
        });
        this.dispatchEvent(event);
    }

    updateStage(newStage) {
        const fields = {};
        fields[ID_FIELD.fieldApiName] = this.recordId;
        fields[STAGE_FIELD.fieldApiName] = newStage;

        
        if (this.selectedLossReason) {
            fields['Loss_Reason__c'] = this.selectedLossReason;
        }

        if (this.selectedCompetitor) {
            fields['Competitor__c'] = this.selectedCompetitor;
        }

        console.log('OUTPUT  STAGE_FIELD.  : ',fields[STAGE_FIELD.fieldApiName]);
        updateRecord({ fields })
            .then(() => {
                this.showToast('Success', 'Stage updated successfully', 'success');
                  
                this.currentStep = newStage;
                this.closePopup();
                 return refreshApex(this.wiredRecord); 
            })
            .catch(error => {
                this.showToast('Error', 'Error updating stage', 'error');
                console.error('OUTPUT : Error Message ', error);
            });
    }

    @wire(getObjectInfo, { objectApiName: Opportunity_OBJECT })
    objectInfo({ data, error }) {
        if (data) {
            const rtInfos = data.recordTypeInfos;
            this.recordTypeId = Object.keys(rtInfos).find(
                (rtId) => rtInfos[rtId].name === 'Planned Purchase APAC'
            );
        } else if (error) {
            console.error('Error fetching object info:', error);
        }
    }

    @wire(getPicklistValuesByRecordType, { objectApiName: Opportunity_OBJECT, recordTypeId: '$recordTypeId' })
    picklistValues({ data, error }) {
        if (data) {
            this.lossReasonOptions = data.picklistFieldValues.Loss_Reason__c.values;
            this.competitorOptions = data.picklistFieldValues.Competitor__c.values;
        } else if (error) {
            console.error('Error fetching picklist values:', error);
        }
    }
}