9. Invoice Upload 
Interface Name 	Invoice Upload 
Description 	Upload the Invoice/Receipt or Debit Note to the server. 
Interface Code 	T109 
Request Encrypted 	Y 	
Response Encrypted 	Y 	
Request Message 	{ 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 	"sellerDetails": { 
 	"tin": "201905081705", 
 	"ninBrn": "201905081705", 
 	"legalName": "zhangsan", 
 	"businessName": "lisi", 
 	"address": "beijin", 
 	"mobilePhone": "15501234567", 
 	"linePhone": "010-6689666", 
 	"emailAddress": "123456@163.com", 
 	"placeOfBusiness": "beijin", 
 	"referenceNo": "00000000012", 
 	"branchId": "207300908813650312", 
 	"isCheckReferenceNo": "0" 
}, 
"basicInformation": { 
 	"invoiceNo": "00000000001", 

		 	 	"antifakeCode": "201905081711", 
	 	 	"deviceNo": "201905081234", 
	 	 	"issuedDate": "2019-05-08 17:13:12", 
	 	 	"operator": "aisino", 
	 	 	"currency": "UGX", 
	 	 	"oriInvoiceId": "1", 
	 	 	"invoiceType": "1", 
	 	 	"invoiceKind": "1", 
	 	 	"dataSource": "101", 
	 	 	"invoiceIndustryCode": "102", 
	 	 	"isBatch": "0", 
       "deliveryTermsCode": "CIF" 
	 	}, 
	 	"buyerDetails": { 
	 	 	"buyerTin": "201905081705", 
	 	 	"buyerNinBrn": "201905081705", 
	 	 	"buyerPassportNum": "201905081705", 
	 	 	"buyerLegalName": "zhangsan", 
	 	 	"buyerBusinessName": "lisi", 
	 	 	"buyerAddress": "beijin", 
	 	 	"buyerEmail": "123456@163.com", 
	 	 	"buyerMobilePhone": "15501234567", 
	 	 	"buyerLinePhone": "010-6689666", 
	 	 	"buyerPlaceOfBusi": "beijin", 
	 	 	"buyerType": "1", 
	 	 	"buyerCitizenship": "1", 
	 	 	"buyerSector": "1", 
	 	 	"buyerReferenceNo": "00000000001", 
	 	 	"nonResidentFlag": "0" 
	 	}, 
	 	"buyerExtend": { 
	 	 	"propertyType": "abc", 
	 	 	"district": "haidian", 
	 	 	"municipalityCounty": "haidian", 
	 	 	"divisionSubcounty": "haidian1", 
	 	 	"town": "haidian1", 
	 	 	"cellVillage": "haidian1", 
	 	 	"effectiveRegistrationDate": "2020-10-19", 
	 	 	"meterStatus": "101" 
	 	}, 
	 	"goodsDetails": [{ 
	 	 	"item": "apple", 
		 	 	"itemCode": "101", 
	 	 	"qty": "2", 
	 	 	"unitOfMeasure": "kg", 
	 	 	"unitPrice": "150.00", 
	 	 	"total": "1", 
	 	 	"taxRate": "0.18", 
	 	 	"tax": "12.88", 
	 	 	"discountTotal": "18.00", 
	 	 	"discountTaxRate": "0.18", 
	 	 	"orderNumber": "1", 
	 	 	"discountFlag": "1", 
	 	 	"deemedFlag": "1", 
	 	 	"exciseFlag": "2", 
	 	 	"categoryId": "1234", 
	 	 	"categoryName": "Test", 
	 	 	"goodsCategoryId": "5467", 
	 	 	"goodsCategoryName": "Test", 
	 	 	"exciseRate": "0.12", 
	 	 	"exciseRule": "1", 
	 	 	"exciseTax": "20.22", 
	 	 	"pack": "1", 
	 	 	"stick": "20", 
	 	 	"exciseUnit": "101", 
	 	 	"exciseCurrency": "UGX", 
	 	 	"exciseRateName": "123", 
  "vatApplicableFlag": "1", 
  "deemedExemptCode": "101", 
  "vatProjectId": "893997229738400343", 
  "vatProjectName": "testName", 
  "hsCode": "27111100", 
  "hsName": "Natural gas", 
  "totalWeight": "10", 
  "pieceQty": "20", 
  "pieceMeasureUnit": "101" 
	 	}, { 
	 	 	"item": "car", 
	 	 	"itemCode": "101", 
	 	 	"qty": "2", 
	 	 	"unitOfMeasure": "kg", 
	 	 	"unitPrice": "150.00", 
	 	 	"total": "1", 

	 	 
 	 
 	 
 	 
 	 
 	 
 	 
 	 
 	 
 	 
 	 
 	 
 	 
 	 
 	 
 	 
 	 
 	 
 	 
 	 
  
  
  
  
  
  
  
  
  	"taxRate": "0.18", 
"tax": "12.88", 
"discountTotal": "18.00", 
"discountTaxRate": "0.18", 
"orderNumber": "2", 
"discountFlag": "1", 
"deemedFlag": "1", 
"exciseFlag": "2", 
"categoryId": "Test", 
"categoryName": "Test", 
"goodsCategoryId": "Test", 
"goodsCategoryName": "Test", 
"exciseRate": "0.12", 
"exciseRule": "1", 
"exciseTax": "20.22", 
"pack": "1", 
"stick": "20", 
"exciseUnit": "101", 
"exciseCurrency": "UGX", 
"exciseRateName": "123", 
"vatApplicableFlag": "1", 
"deemedExemptCode": "101", 
"vatProjectId": "893997229738400343", 
"vatProjectName": "testName", 
"hsCode": "27111100", 
"hsName": "Natural gas", 
"totalWeight": "10", 
"pieceQty": "20", 
"pieceMeasureUnit": "101" 
		 	}], 
	 	"tax
 	 
 	 
 	 
 	 
 	 
 	 
 	 
 	 
	 	}, { 	Details": [{ 
"taxCategoryCode": "01", 
"netAmount": "3813.55", 
"taxRate": "0.18", 
"taxAmount": "686.45", 
"grossAmount": "4500.00", 
"exciseUnit": "101", 
"exciseCurrency": "UGX", 
"taxRateName": "123" 

		 	 	"taxCategoryCode": "05", 
	 	 	"netAmount": "1818.18", 
	 	 	"taxRate": "0.1", 
	 	 	"taxAmount": "181.82", 
	 	 	"grossAmount": "2000.00", 
	 	 	"exciseUnit": "101", 
	 	 	"exciseCurrency": "UGX", 
	 	 	"taxRateName": "123" 
	 	}], 
	 	"summary": { 
	 	 	"netAmount": "8379", 
	 	 	"taxAmount": "868", 
	 	 	"grossAmount": "9247", 
	 	 	"itemCount": "5", 
	 	 	"modeCode": "0", 
	 	 	"remarks": "This is another remark test.", 
	 	 	"qrCode": "asdfghjkl" 
	 	}, 
"payWay": [{ 
	 	 	"paymentMode": "101", 
	 	 	"paymentAmount": "686.45", 
	 	 	"orderNumber": "a" 
	 	}, { 
	 	 	"paymentMode": "102", 
	 	 	"paymentAmount": "686.45", 
	 	 	"orderNumber": "a" 
	 	}], 
	 	"extend": { 
"reason": "reason", 
"reasonCode": "102" 
}, 
"importServicesSeller": { 
	 	 	"importBusinessName": "lisi", 
	 	 	"importEmailAddress": "123456@163.com", 
	 	 	"importContactNumber": "15501234567", 
	 	 	"importAddress": "beijin", 
 	 	"importInvoiceDate": "2020-09-05",  	 	"importAttachmentName": "test",  	 	"importAttachmentContent": 
"MIIDFjCCAf6gAwIBAgIRAKPGAol9CEdpkIoFa8huM6zfj1WEBRxteoo6PH46un4
FGj4N6ioIGzVr9G40uhQGdm16ZU+q44XjW2oUnI9w=" 
		 	}, 
"airlineGoodsDetails": [{ 
 "item": "apple", 
 "itemCode": "101", 
 "qty": "2", 
 "unitOfMeasure": "103", 
 "unitPrice": "150.00", 
 "total": "1", 
 "taxRate": "0.18", 
 "tax": "12.88", 
 "discountTotal": "18.00", 
 "discountTaxRate": "0.18", 
 "orderNumber": "1", 
 "discountFlag": "1", 
 "deemedFlag": "1", 
 "exciseFlag": "2", 
 "categoryId": "1234", 
 "categoryName": "Test", 
 "goodsCategoryId": "5467", 
 "goodsCategoryName": "Test", 
 "exciseRate": "0.12",  "exciseRule": "1", 
 "exciseTax": "20.22", 
 "pack": "1", 
 "stick": "20", 
 "exciseUnit": "101", 
 "exciseCurrency": "UGX", 
 "exciseRateName": "123" 
}], 
"edcDetails":{ 
 "tankNo": "1111", 
 "pumpNo": "2222", 
 "nozzleNo": "3333", 
 "controllerNo": "44444", 
 "acquisitionEquipmentNo": "5555", 
 "levelGaugeNo": "66666", 
 "mvrn":"" 
} 
 
} 
Response Message 	{ 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 	"sellerDetails": { 
	 	"tin": "201905081705", 
	 	"ninBrn": "201905081705", 
	 	"passportNumber": "201905081705", 
	 	"legalName": "zhangsan", 
	 	"businessName": "lisi", 
	 	"address": "beijin", 
	 	"mobilePhone": "15501234567", 
	 	"linePhone": "010-6689666", 
	 	"emailAddress": "123456@163.com", 
	 	"placeOfBusiness": "beijin", 
	 	"referenceNo": "00000000012", 
	 	"branchId": "207300908813650312", 
 	"branchName": "KATUSIIME EVEALYNE SPARE PARTS", "branchCode": "00" 
}, 
"basicInformation": { 
	 	"invoiceId": "1000002", 
	 	"invoiceNo": "00000000001", 
	 	"antifakeCode": "201905081711", 
	 	"deviceNo": "201905081234", 
	 	"issuedDate": "2019-05-08 17:13:12", 
	 	"operator": "aisino", 
	 	"currency": "UGX", 
	 	"oriInvoiceId": "1", 
	 	"invoiceType": "1", 
	 	"invoiceKind": "1", 
	 	"dataSource": "101", 
 	"invoiceIndustryCode": "102",  	"isBatch": "0", 
 "currencyRate": "3700.12" 
}, 
"buyerDetails": { 
	 	"buyerTin": "201905081705", 
	 	"buyerNinBrn": "201905081705", 
	 	"buyerPassportNum": "201905081705", 
	 	"buyerLegalName": "zhangsan", 
	 	"buyerBusinessName": "lisi", 
	 	"buyerAddress": "beijin", 
	 	"buyerEmail": "123456@163.com", 
		 	 	"buyerMobilePhone": "15501234567", 
	 	 	"buyerLinePhone": "010-6689666", 
	 	 	"buyerPlaceOfBusi": "beijin", 
	 	 	"buyerType": "1", 
	 	 	"buyerCitizenship": "1", 
	 	 	"buyerSector": "1", 
	 	 	"buyerReferenceNo": "00000000001" 
	 	}, 
	 	"buyerExtend": { 
	 	 	"propertyType": "abc", 
	 	 	"district": "haidian", 
	 	 	"municipalityCounty": "haidian", 
	 	 	"divisionSubcounty": "haidian1", 
	 	 	"town": "haidian1", 
	 	 	"cellVillage": "haidian1", 
	 	 	"effectiveRegistrationDate": "2020-10-19", 
	 	 	"meterStatus": "101" 
	 	}, 
	 	"goodsDetails": [{ 
	 	 	"item": "apple", 
	 	 	"itemCode": "101", 
	 	 	"qty": "2", 
	 	 	"unitOfMeasure": "kg", 
	 	 	"unitPrice": "150.00", 
	 	 	"total": "1", 
	 	 	"taxRate": "0.18", 
	 	 	"tax": "12.88", 
	 	 	"discountTotal": "18.00", 
	 	 	"discountTaxRate": "0.18", 
	 	 	"orderNumber": "1", 
	 	 	"discountFlag": "1", 
	 	 	"deemedFlag": "1", 
	 	 	"exciseFlag": "2", 
	 	 	"categoryName": "Test", 
	 	 	"goodsCategoryName": "Test", 
	 	 	"exciseRate": "0.12", 
	 	 	"exciseRule": "1", 
	 	 	"exciseTax": "20.22", 
	 	 	"pack": "1", 
	 	 	"stick": "20", 
	 	 	"exciseUnit": "101", 
	 	 	"exciseCurrency": "UGX", 
		 	 	"exciseRateName": "123", 
  "vatApplicableFlag": "1", 
  "deemedExemptCode": "101", 
  "vatProjectId": "893997229738400343", 
  "vatProjectName": "testName", 
  "hsCode": "27111100", 
  "hsName": "Natural gas", 
  "totalWeight": "10", 
  "pieceQty": "20", 
  "pieceMeasureUnit": "101" 
	 	}, { 
	 	 	"item": "car", 
	 	 	"itemCode": "101", 
	 	 	"qty": "2", 
	 	 	"unitOfMeasure": "kg", 
	 	 	"unitPrice": "150.00", 
	 	 	"total": "1", 
	 	 	"taxRate": "0.18", 
	 	 	"tax": "12.88", 
	 	 	"discountTotal": "18.00", 
	 	 	"discounttaxRate": "0.18", 
	 	 	"orderNumber": "2", 
	 	 	"discountFlag": "1", 
	 	 	"deemedFlag": "1", 
	 	 	"exciseFlag": "2", 
	 	 	"categoryName": "Test", 
	 	 	"goodsCategoryName": "Test", 
	 	 	"exciseRate": "0.12", 
	 	 	"exciseRule": "1", 
	 	 	"exciseTax": "20.22", 
	 	 	"pack": "1", 
	 	 	"stick": "20", 
	 	 	"exciseUnit": "101", 
	 	 	"exciseCurrency": "UGX", 
	 	 	"exciseRateName": "123", 
  "vatApplicableFlag": "1", 
  "deemedExemptCode": "101", 
  "vatProjectId": "893997229738400343", 
  "vatProjectName": "testName", 
  "hsCode": "27111100", 
	  "hsName": "Natural gas", 
  "totalWeight": "10", 
  "pieceQty": "20", 
  "pieceMeasureUnit": "101" 
	 	}], 
	 	"taxDetails": [{ 
  "taxCategory": "'Standard",        "taxCategoryCode": "01", 
	 	 	"netAmount": "3813.55", 
	 	 	"taxRate": "0.18", 
	 	 	"taxAmount": "686.45", 
	 	 	"grossAmount": "4500.00", 
	 	 	"exciseUnit": "101", 
	 	 	"exciseCurrency": "UGX", 
	 	 	"taxRateName": "123" 
	 	}, { 
	 	 	"taxCategory": "''Excise Duty", 
       "taxCategoryCode": "05", 
	 	 	"netAmount": "1818.18", 
	 	 	"taxRate": "0.1", 
	 	 	"taxAmount": "181.82", 
	 	 	"grossAmount ": "2000.00", 
	 	 	"exciseUnit": "101", 
	 	 	"exciseCurrency": "UGX", 
	 	 	"taxRateName": "123" 
	 	}], 
	 	"summary": { 
	 	 	"netAmount": "8379", 
	 	 	"taxAmount": "868", 
	 	 	"grossAmount": "9247", 
	 	 	"itemCount": "5", 
	 	 	"modeCode": "0", 
	 	 	"remarks": "This is another remark test.", 
	 	 	"qrCode": "asdfghjkl" 
}, 
"payWay": [{ 
	 	 	"paymentMode": "101", 
	 	 	"paymentAmount": "686.45", 
	 	 	"orderNumber": "a" 
	 	}, { 
	 	 	"paymentMode": "102", 
	 	 	"paymentAmount": "686.45", 
		 	 	"orderNumber": "a" 
	 	}], 
	 	"extend": { 
"reason": "reason", 
"reasonCode": "102" 
}, 
"importServicesSeller": { 
	 	 	"importBusinessName": "lisi", 
	 	 	"importEmailAddress": "123456@163.com", 
	 	 	"importContactNumber": "15501234567", 
	 	 	"importAddress": "beijin", 
 	 	"importInvoiceDate": "2020-09-05",  	 	"importAttachmentName": "test",  	 	"importAttachmentContent": 
"MIIDFjCCAf6gAwIBAgIRAKPGAol9CEdpkIoFa8huM6zfj1WEBRxteoo6PH46un4
FGj4N6ioIGzVr9G40uhQGdm16ZU+q44XjW2oUnI9w=" 
	 	}, 
"airlineGoodsDetails": [{ 
 "item": "apple", 
 "itemCode": "101", 
 "qty": "2", 
 "unitOfMeasure": "103", 
 "unitPrice": "150.00", 
 "total": "1", 
 "taxRate": "0.18", 
 "tax": "12.88", 
 "discountTotal": "18.00", 
 "discountTaxRate": "0.18", 
 "orderNumber": "1", 
 "discountFlag": "1", 
 "deemedFlag": "1", 
 "exciseFlag": "2", 
 "categoryId": "1234", 
 "categoryName": "Test", 
 "goodsCategoryId": "5467", 
 "goodsCategoryName": "Test", 
 "exciseRate": "0.12",  "exciseRule": "1", 
 "exciseTax": "20.22", 
 "pack": "1", 
 "stick": "20", 
	 "exciseUnit": "101", 
 "exciseCurrency": "UGX", 
 "exciseRateName": "123" 
}], 
"edcDetails":{ 
 "tankNo": "1111", 
 "pumpNo": "2222", 
 "nozzleNo": "3333", 
 "controllerNo": "44444", 
 "acquisitionEquipmentNo": "5555", 
 "levelGaugeNo": "66666", 
 "mvrn":"" 
}, 
"existInvoiceList": [{ 
  "invoiceNo": "322000150744", 
  "antifakeCode": "31359767222004350398",   "qrCode": 
"02000000416B9C322000150744000016E3600000037DCDFFFFFFFFFFFFA1009837
013A1009972333~Mr. ANDREW KIIZA~Mr. SSEMATIKO TIMOTHY~Test01" 
 }], 
"agentEntity": { 
  "tin": "1111", 
  "legalName": "2222", 
  "businessName": "3333", 
  "address": "44444" 
 } 
 
} 
Flow Description 	The operator operates the tax control machine and calculates and invoices the guest. 
If the invoice upload time is greater than or less than 10 minutes of server time, add a piece of data to the T_INVOICE_EXCEPTION invoice exception table, EXCEPTION_TYPE_CODE = 101 
Field description Seller InformationInternal field: 
Field 	Field Name 	Required 	Length 	Description 
tin 	sellerTIN 	Y 	10-20 	Seller’s TIN number. Must be the same as the one in globalInfo 
ninBrn 	sellerNIN 	N 	100 	Seller’s NIN if individual or BRN if 
				a business 
legalName 	legal name 	Y 	256 	 
businessName 	business name 	N 	256 	 
address 	Seller address 	N 	500 	 
mobilePhone 	mobile phone 	N 	30 	 
linePhone 	line phone 	N 	30 	 
emailAddress 	Seller email 	Y 	50 	Mailbox format 
placeOfBusines
s 	place of business 	N 	500 	 
referenceNo 	referenceNo 	Y 	50 	The seller’s transaction reference. 
If invoiceIndustryCode = 104, this cannot be empty! 
branchId 	branchId 	N 	18 	 
isCheckReferen ceNo 	isCheckReferenceN o 	N 	1 	0:No(default) 1:Yes 
branchName 	branchName 	Y 	500 	Return branchName for response 
branchCode 	branchCode 	N  	50 	Return branchCode for response 
 
	Basic InformationInternal field:  	 
Field 	Field Name 	Required 	Length 	Description 
invoiceNo 	Invoice number 	N 	20 	Fiscal Document Number from URA.  
This should be left empty in the request. 
antifakeCode 	antifake code 	N 	20 	Verification code.  
This should be left empty in the request. 
deviceNo 	device Number 	Y 	20 	Device Number (20 digits) 
issuedDate 	invoice issued date 	Y 	date 	yyyy-MM-dd HH24:mm:ss 
operator 	Operator 	Y 	150 	The person serving the customer. 
currency 	currency 	Y 	10 	Currency code of the transaction e.g. UGX 
from T115 currencyType -->name 
oriInvoiceId 	originalInvoice ID 	N 	20 	Leave empty if raising an invoice/receipt.  
For debit notes, populate the invoiceId that was returned against the original invoice/receipt. 
invoiceType 	invoice type 	Y 	1 	1:Invoice/Receipt 
5:Credit Memo/rebate 
				4:Debit Note 
invoiceKind 	invoice kind 	Y 	1 	1: invoice  
2: receipt 
dataSource 	data source 	Y 	3 	101:EFD 
102:Windows Client APP 
103:WebService API 
104:Mis 
105:Webportal 
106:Offline Mode Enabler 
107:USSD 
108:ASK URA 
 
invoiceIndustry Code 	invoiceIndustryCod e 	N 	3 	101:General Industry 
102:Export 
104:Imported Service 
105:Telecom 
106:Stamp Duty 
107:Hotel Service 
108:Other taxes 
109:Airline Business 
110:EDC 
111:Auction 
112:Export Service 
isBatch 	isBatch 	N 	1 	Not required, the value is 0 or 1, if it is empty, the default is 0. 
0-not a batch summary invoice, 1batch summary invoice 
currencyRate 	currencyRate 	N 	Number 	 
 
Buyer DetailsInternal field: 
Field 	Field Name 	Required 	Length 	Description 
buyerTin 	Buyer TIN 	N 	10-20 	TIN number of the buyer. 
Mandatory if B2B or B2G 
buyerNinBrn 	Buyer NIN/BRN 	N 	100 	 
buyerPassport Num 	Passport number 	N 	20 	 
buyerLegalNam
e 	legal name 	N 	256 	 
buyerBusinessN ame 	business name 	N 	 	256 	 
buyerAddress 	buyeraddress 	N 	500 	 
buyerEmail 	buyeremail 	N 	50 	Mailbox format 
buyerMobilePh one 	mobile phone 	N 	30 	 
buyerLinePhon e 	line phone 	N 	30 	 
buyerPlaceOfB
usi 	place of business 	N 	500 	 
buyerType 	Buyer Type 	Y 	1 	0	: B2B  
1	: B2C 
2	: Foreigner 
3	: B2G 
buyerCitizenshi p 	Buyer Citizenship 	N 	128 	 
buyerSector 	Buyer Sector 	N 	200 	 
buyerReference No 	Buyer ReferenceNo 	N 	50 	Customer reference or identifier 
nonResidentFl ag 	nonResidentFlag 	N 	1 	Not required.  The default value is 0. 
deliveryTerms Code 	Delivery Terms 	N 	3 	When export is Mandatory CFR : Cost and Freight 
CIF : Cost Insurance and 
Freight 
CIP : Carriage and Insurance 
Paid To 
CPT :Carriage Paid to  
DAP :Delivered at Place 
DDP :Delivered Duty Paid 
DPU :Delivered at Place 
Unloaded 
EXW :Ex Works 
FAS :Free Alongside Ship  
FCA :Free Carrier  
FOB :Free on Board 
Buyer Extend field: 
Field 	Field Name 	Required 	Length 	Description 
propertyType 	Property type 	N 	50 	 
district 	District 	N 	50 	 
municipalityCo unty 	Country or Municipality 	N 	50 	 
divisionSubcou nty 	Division or Sub county 	N 	50 	 
town 	town 		N 	 	50 	 
cellVillage 	cell or village 		N 	60 	 
effectiveRegistr ationDate 	Effective registration  date 		N 	date 	The time format must be yyyy-
MM-dd 
meterStatus 	Status of the meter 
(active or in active) 	N 		3 	101:active 
102:in active 
 
Goods Details Internal field: 
Field 	Field Name 	Required 	Length 	Description 
item 	item name 	Y 	200 	If discountFlag is 0, the name of the discount line is equal to the name of the discounted line + space + "(discount)". 
If deemedFlag is 1 
Name + space + ”(deemed)” 
If discountFlag is 0 and deemedFlag is 1 
Name + Space + ”(deemed)” + Space + ”(discount)” 
itemCode 	item code 	Y 	50 	As configured from the portal 
qty 	Quantity 	N 	Number 	Required if discountFlag is 1 or 2 and must be positive must be empty when discountFlag 
is 0 
Integer digits cannot exceed 12, decimal digits cannot exceed 8; 
unitOfMeasure 	unit of measure 	N 	3 	The full list of units of measure is returned in the system dictionary 
(T115) under the section rateUnit. Required if discountFlag is 1 or 2 
 
unitPrice 	unit Price 	N 	Number 	Required if discountFlag is 1 or 2 
and must be positive 
Must be empty when discountFlag is 0 
Integer digits cannot exceed 12, decimal digits cannot exceed 8; 
total 	total price 	Y 	Number 	 must be positive when 
discountFlag is 1 or 2; must be negative when 

				discountFlag is 0; 
Integer digits cannot exceed 12, decimal digits cannot exceed 4; 
taxRate 	tax rate 	Y 	Number 	For example, the taxRate is 18%  Fill in: 0.18 
For example, the taxRate is zero Fill in: 0 
For example, the taxRate is deemed  Fill in: ‘-’ or ' ' 
 
Integer digits cannot exceed 1, decimal digits cannot exceed 4; 
tax 	tax 	Y 	Number 	must be positive when 
discountFlag  is 1 or 2 
must be negative when 
discountFlag is 0; 
Integer digits cannot exceed 12, decimal digits cannot exceed 4; 
discountTotal 	discount total 	N 	Number 	must be empty when discountFlag is 0 or 2 must be negative when discountFlag is 1 
And equal to the absolute value of the total of the discount line 
discountTaxRat e 	discount tax rate 	N 	number 	Save decimals, such as 18% deposit 
0.18 
Decimal places must not exceed 5 
orderNumber 	order number 	Y 	number 	Add one each time from zero 
discountFlag 	Whether the product line is discounted 	Y 	1 	0: discount on amount 
1: discount on entire item 
2: non-discount item 
The first line item cannot be 0 and the last line cannot be 1 
deemedFlag 	Whether deemed 
or not 	Y 	1 	1: deemed  
2: not deemed 
exciseFlag 	Whether the item attracts excise duty 
or not 	Y 	1 	1: excise 
2: not excise 

categoryId 	exciseDutyCode 	N 	18 	Excise Duty id 
Required when exciseFlag is 1 
categoryName 	Excise Duty category name 	N 	1024 	Required when exciseFlag is 1 
goodsCategory
Id 	goods Category id 	Y 	18 	Vat tax commodity classification 
goodsCategory Name 	goods Category Name 	N 	200 	 
exciseRate 	Excise tax rate 	N 	21 	Required when exciseFlag is 1. 
Is null when exciseFlag is 2. 
Consistent with categoryId data When exciseRule is 1, excise duty is calculated as a percentage. For example, the excise duty rate is 
18%. Fill in: 0.18. If the excise duty rate is ‘Nil’, enter ‘-’ 
When exciseRule is 2, the excise duty is calculated in units of 
measurement. For example, the excise duty is 100. Fill in: 100 
exciseRule 	Excise Calculation Rules 	N 	1 	1: Calculated by tax rate  2: Calculated by Quantity 
Required when exciseFlag is 1 
exciseTax 	Excise tax 	N 	number 	Total excise tax for this line item 
Required when exciseFlag is 1 
Must be positive 
Integer digits cannot exceed 12, decimal digits cannot exceed 4; 
pack 	pack 	N 	number 	Required when exciseRule is 2 
Must be positive; 
Integer digits cannot exceed 12, decimal digits cannot exceed 8; 
Use packageScaledValue in T130  
stick 	stick 	N 	number 	Required when exciseRule is 2 
Must be positive; 
Integer digits cannot exceed 12, decimal digits cannot exceed 8; 
Use pieceScaledValue from T130 if item does not have a piece unit 
value then use the same value as 
pack above 

exciseUnit 	exciseUnit 	N 	3 	Corresponding to dictionarycode rateUnit; 
101	per stick 
102	per litre 
103	per kg 
104	per user per day of access 
105	per minute 
106	per 1,000sticks 
107	per 50kgs 
108	- 109 per 1 g 
exciseCurrency 	exciseCurrency 	N 	10 	Required when exciseRule is 2 from T115 currencyType -->name 
exciseRateNam
e 	exciseRateName 	N 	100 	If exciseRule is 1, the value is 
(exciseRate * 100) plus the character '%', for example 
exciseRate is 0.18, this value is 18% 
If exciseRule is 2, this value is exciseCurrency + exciseRate + 
space + exciseUnit, for example: UGX650 per litre 
vatApplicable Flag 	vatApplicableFla g 	N 	1 	It is not required.  
The default value is 1. 
0 when using VAT Out of Scope 
deemedExemptC ode 	deemedExemptCode 	N 	3 	101:Deemed 
102:Exempt 
vatProjectId 	vatProjectId 	N 	18 	Required if deemed flag is 1 
vatProjectNam e 	vatProjectName 	N 	300 	Required if deemed flag is 1 
hsCode 	HS Code (Optional) 	N 	50 	 
hsName 	HS Code Description 	N 	1000 	 
totalWeight 	Total Net Weight(KGM) 	Y 	number 	Mandatory for Export invoices i.e. when invoiceindustrycode is 102 
pieceQty 	Piece Quantity 	N 	Number 	Mandatory for Export invoices i.e. when invoiceindustrycode is 102 
pieceMeasureU nit 	Piece Measure 
Unit 	N 	3 	Mandatory for Export invoices i.e. when invoiceindustrycode 
				is 102 
 
If exciseflag is 1, please provide the Customs measure unit as per the item 
configuration 
 
Tax DetailsInternal field: 
Field 	Field Name 	Required 	Length 	Description 
taxCategoryCo de 	taxCategoryCode 	N 	2 	01:A: Standard (18%) 
02:B: Zero (0%) 
03:C: Exempt (-) 
04:D: Deemed (18%) 
05:E: Excise Duty 
06:Over the Top Service (OTT) 
07:Stamp Duty 
08:Local Hotel Service Tax 
09:UCC Levy 
10:Others 
11:F: VAT Out of Scope 
netAmount  	net amount 	Y 	number 	Must be positive or 0; 
Integer digits cannot exceed 16, decimal digits cannot exceed 4; 
taxRate 	tax rate 	Y 	number 	If 18% use 0.18 
If zero-rated use 0 
If exempt use ‘-’ 
taxAmount 	tax 	Y 	number 	Must be positive or 0; 
Integer digits cannot exceed 16, decimal digits cannot exceed 4; 
grossAmount 	gross amount 	Y 	number 	Must be positive or 0; 
Integer digits cannot exceed 16, decimal digits cannot exceed 4; 
exciseUnit 	exciseUnit 	N 	3 	When the tax type is Excise Duty and the tax rate is calculated per 
unit, it is required 
exciseCurrency 	exciseCurrency 	N 	10 	When the tax type is Excise Duty and the tax rate is calculated per 
unit, it is required 
taxRateName 	Tax Rate Name 	N 	100 	If 'taxCategoryCode' is empty,'taxRateName' is 
required 
 
SummaryInternal field: 
Field 	Field Name 	Required 	Length 	Description 
netAmount 	 net amount  	Y 	number 	Tax Receipt total net amount  
Must be positive or 0; 
Integer digits cannot exceed 16, decimal digits cannot exceed 4; 
taxAmount  	 tax amount 	Y 	number 	Tax Receipt total tax amount 
Must be positive or 0; 
Integer digits cannot exceed 16, decimal digits cannot exceed 4; 
grossAmount 	 gross amount 	Y 	number 	Tax Receipt total gross amount 
Must be positive; 
Integer digits cannot exceed 16, decimal digits cannot exceed 4; 
itemCount 	Purchase item lines 	Y 	Number （4） 	Must match the Number of all product lines in goodsDetailnumber of discount lines! 
modeCode 	mode 	Y 	1 	Issuing receipt mode  
(1:Online or 0:Offline) ,this code is from dictionary table 
remarks 	Remarks 	N 	500 	 
qrCode 	qrCode 	N 	500 	Required if mode is 0 
 
PayWay field: 
Field 	Field Name 	Required 	Length 	Description 
paymentMode  	paymentMode  	Y 	number 	payWay dictionary table 
101	Credit 
102	Cash 
103	Cheque 
104	Demand draft 
105	Mobile money 
106	Visa/Master card 
107	EFT 
108	POS 
109	RTGS 
110	Swift transfer 
paymentAmou nt 	 	paymentAmount 	Y 	number 	Tax Receipt total tax amount 
Must be positive or 0 
Integer digits cannot exceed 16; 
orderNumber 	orderNumber 	Y 	1 	Sort by lowercase letters, 
				such as a, b, c, d, etc. 
 
ExtendInternal field: 
Field 	Field Name 	Required 	Length 	Description 
reason 	Cancel reason 	N 	1024 	 
reasonCode 	debitNoteReason 	N 	3 	If invoiceType is 4, use the following values: 
 101:Increase in the amount payable/invoice value due to extra products delivered or products delivered charged at an incorrect value. 102:Buyer asked for a new debit note. 
103:Others (Please specify);  If invoiceType is 5, use the following values: 
 
101:Trade discount 
102:Rebate 
103:Others(Please specify) 
 
 
ImportServicesSeller field: 
Field 	Field Name 	Required 	Length 	Description 
importBusiness Name 	Import BusinessName 	N 	500 	invoiceIndustryCode is equal to 104, importbusinessname cannot be empty 
importEmailAd dress 	Import EmailAddress 	N 	50 	The byte length cannot be less than 6 and cannot be greater 
than50 
importContact Number 	Import ContactNumber 	N 	30 	 
importAddress 	Import Address 	N 	500 	invoiceIndustryCode is equal to 
104, importAddress cannot be empty 
importInvoiceD ate 	importInvoiceDate 	Y 	date 	yyyy-MM-dd 
importAttachm	importAttachment	 	N 	256 	importAttachmentName eg: 
entName 	Name 			test.png 
Attachment format: png、doc、 pdf、jpg、txt、docx、xlsx、cer、
crt、der 
importAttachm entContent 	importAttachment Content 	N 	Unlimit ed 	 
airlineGoodsDetails field: 
Field 	Field Name 	Required 	Length 	Description 
item 	item name 	Y 	200 	discountFlag is 0, the name of the discount line is equal to the name of the discounted 
line + space + "(discount)" When deemedFlag is 1 
Name + space + ”(deemed)” 
If discountFlag is 0 and deemedFlag is 1 
Name + Space + ”(deemed)” + 
Space + ”(discount)” 
itemCode 	item code 	N 	50 	 
qty 	Quantity 	Y 	Number 	Required if discountFlag is 1 or 2 and must be positive must be empty when 
discountFlag is 0 
Integer digits cannot exceed 
12, decimal digits cannot exceed 8; 
unitOfMeasure 	unit of measure 	Y 	3 	from T115 rateUnit -->value Required if discountFlag is 1 or 2 
unitPrice 	unit Price 	Y 	Number 	Required if discountFlag is 1 or 2 and must be positive must be empty when 
discountFlag is 0 
Integer digits cannot exceed 
12, decimal digits cannot exceed 8; 
total 	total price 	Y 	Number 	 must be positive when discountFlag is 1 or 2 
must be negative when discountFlag is 0 
Integer digits cannot exceed 

				12, decimal digits cannot exceed 4; 
taxRate 	tax rate 	N 	Number 	For example, the taxRate is 18%  Fill in: 0.18 
For example, the taxRate is zero Fill in: 0 
For example, the taxRate is deemed  Fill in: ‘-’ or ' ' 
 
Integer digits cannot exceed 
1, decimal digits cannot exceed 4; 
tax 	tax 	N 	Number 	must be positive when 
discountFlag  is 1 or 2 
must be negative when 
discountFlag is 0; 
Integer digits cannot exceed 
12, decimal digits cannot exceed 4; 
discountTotal 	discount total 	N 	Number 	must be empty when 
discountFlag is 0 or 2 
must be negative when discountFlag is 1 And equal to the absolute value of the total of the discount line 
discountTaxRa te 	discount tax rate 	N 	Number 	Save decimals, such as 18% deposit 0.18 
Integer digits cannot exceed 
2, decimal digits cannot exceed 12; 
orderNumber 	order number 	Y 	Number 	Add one each time from zero 
discountFlag 	Whether the product line is discounted 	N 	1 	0:discount amount 1:discount good, 2:non-discount good 
The first line cannot be 0 and the last line cannot be 1 
deemedFlag 	Whether deemed 	N 	1 	1 : deemed 2: not deemed 
exciseFlag 	Whether excise 	N 	1 	1 : excise  2: not excise 
categoryId 	exciseDutyCode 	N 	18 	Excise Duty id 
Required when exciseFlag is 1 
categoryName 	Excise Duty 	N 	1024 	Required when exciseFlag is 1 

	category name 			
goodsCategory Id 	goods Category id 	N 	18 	Vat tax commodity classification, currently stored is taxCode 
goodsCategory Name 	goods Category 
Name 	N 	200 	 
exciseRate 	Excise tax rate 	N 	21 	Required when exciseFlag is 1 null when exciseFlag is 2 Consistent with categoryId data 
When exciseRule is 1, consumption tax is calculated as a percentage. For example, the consumption tax rate is 
18%. Fill in: 0.18. If the consumption tax rate is 
‘Nil’, enter ‘-’ 
When exciseRule is 2, the consumption tax is calculated in units of measurement. For example, the consumption tax rate is 100. Fill in: 100 
exciseRule 	Excise 
Calculation 
Rules 	N 	1 	1: Calculated by tax rate 2 Calculated by Quantity 
Required when exciseFlag is 1 
exciseTax 	Excise tax 	N 	number 	Required when exciseFlag is 1 
Must be positive 
Integer digits cannot exceed 
12, decimal digits cannot exceed 4; 
pack 	pack 	N 	number 	Required when  exciseRule is 2 
Must be positive; 
Integer digits cannot exceed 
12, decimal digits cannot exceed 8; 
stick 	stick 	N 	number 	Required when exciseRule is 2 
Must be positive; 
Integer digits cannot exceed 
				12, decimal digits cannot exceed 8; 
exciseUnit 	exciseUnit 	N 	3 	Corresponding to dictionarycode rateUnit 
 
exciseCurrenc y 	exciseCurrency 	N 	10 	Required when exciseRule is 2 from T115 currencyType -
->name 
exciseRateNam e 	exciseRateName 	N 	100 	If exciseRule is 1, the value is (exciseRate * 100) plus the character '%', for example 
exciseRate is 0.18, this value is 18% 
If exciseRule is 2, this value is exciseCurrency + exciseRate + space + 
exciseUnit, for example: UGX650 per litre 
EDC Details field: 
Field 	Field Name 	Required 	Length 	Description 
tankNo 	Tank  no. 	Y 	50 	 
pumpNo 	Pump no. 	Y 	50 	 
nozzleNo 	Nozzle no. 	 Y 	50 	 
controllerNo 	Controller no. 	N 	50 	 
acquisitionEq uipmentNo 	Acquisition Equipment No. 	N 	50 	 
levelGaugeNo 	Level Gauge No. 	N 	50 	 
mvrn 	mvrn 	N 	32 	 
updateTimes 	Update Times 	N 	2 	 
agentEntity field: 
Field 	Field Name 	Required 	Length 	Description 
tin 	tin 	N 	10-20 	 
legalName 	legalName 	N 	256 	 
businessName 	businessName 	 N 	256 	 
address 	address 	N 	500 	 

