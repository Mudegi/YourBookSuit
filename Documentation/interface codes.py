 
API DOCUMENTATION (FOR SYSTEM TO SYSTEM USERS) 
Version 23.4.0 
EFRIS 
kakasa@ura.go.ug 
 Document History 
2019-04-03 	V1.0 	Created by URA 
2024-9-10 	V23.0 	Add new interface T186、T187 
2024-9-24 	V23.1 	T108 –> Add new field ‘invoiceItemId’; 
2025-3-18 	V23.3 	T103→ Add new fields issueDebitNote, qrCodeURL; T108→ Add new object ‘creditNoteExtend’ to support 
partial issued Credit; 
T110→ Update the error code desc of 
 1434: goodsDetails-->qty:Cannot be greater than the remaining value of the corresponding commodity line on original invoice； 
1460: goodsDetails-->total:Cannot be greater than the remaining amount of the corresponding commodity line on original invoice； 
T109→ Update the error code desc of 306：Credit note(s) have already been issued against this invoice. Please cancel the existing credit note(s) to proceed;  
2025-4-9 	V23.4 	Update T127、T130→ Add a new object for customs UoM: 
commodityGoodsExtendEntity 
TABLE OF CONTENTS 
Interface specification	3 
Introduction	3 
Field description	4 
ReturnCode description	7 
Interface code table	51 
Webservice interface code table	51 

Request/Response code table ....................................................................................................................................... 51 
 
 	  
Interface specification 
Introduction 
The system interface uses JSON format to transfer data. The payload is divided into three parts: data, globalInfo, and returnStateInfo. 
	The data part contains the inner layer message content and the encryption method of the message. 
	The globalInfo part is a global variable containing interface information and other necessary attributes.  
	returnStateInfo part is the result status information. 
The outer layer protocol format is as follows: 
{ 
"data": { 
        "content": "encrypted content", 
        "signature": "JKQWJK34K32JJEK2JQWJ5678", 
        "dataDescription": { 
            "codeType": "0", 
            "encryptCode": "1", 
            "zipCode": "0" 
        } 
    }, 
    "globalInfo": { 
        "appId": "AP01", 
	 	 	 "version": "1.1.20191201", 
        "dataExchangeId": "9230489223014123", 
        "interfaceCode": "T101", 
        "requestCode": "TP", 
        "requestTime": "2025-05-13 15:07:07", 
        "responseCode": "TA",         "userName": "admin", 
"deviceMAC": "FFFFFFFFFFFF", 
        "deviceNo": "00022000634", 
        "tin": "1009830865", 
"brn": "", 
"taxpayerID": "1", 
	 	 	"longitude": "116.397128", 
 	 	"latitude": "39.916527",        "agentType": "0", 
"extendField": { 
	 	        "responseDateFormat": "dd/MM/yyyy", 
	 	        "responseTimeFormat": "dd/MM/yyyy HH:mm:ss", 
	 	        "referenceNo": "21PL010020807" , 
	 	        "operatorName": "administrator", 
         "itemDescription": "28300 test services both", 
	 	        "currency":"UGX", 
	 	        "grossAmount":"25", 
	 	        "taxAmount":"3.7985", 
"offlineInvoiceException": { 
 "errorCode": "", 
 "errorMsg": "" 
}  
} 
    }, 
    "returnStateInfo": { 
        "returnCode": "", 
        "returnMessage": "" 
    } 
} 
 
Request message date format: yyyy-MM-dd HH24:mi:ss 
Return message date format: Follows system time format 
T101 return date format: dd/MM/yyyy HH:mm:ss 
Field description 
Field 	Field Name 	Required 	Length 	Description 
content 	Inner message 	N 	Unlimite	This field can be empty if the 

			d 	request message is empty. 
If the request message is not empty, the field must be BASE64 encoded regardless of encryption. 
signature 	Signature value 	Y 	 	 
codeType 	YN encryption 	Y 	1 	0-plain text 1- ciphertext 
encryptCode 	Encryption 	Y 	1 
 	If codeType is 1, encryptCode takes effect 
1-RSA 
2-AES 
zipCode 	YN compression 	Y 	1 	0-uncompressed, 1-compressed If set to 1, the content in the response is compressed. 
appId 	 	Y 	5 	AP04-for system2system 
AP05-for AskURA 
version 	version number 	Y 	15 	Client software version number 
1.1.20191201 
dataExchangeId 	Data interaction ID 	Y 	32 	UUID 
interfaceCode 	Interface code 	Y 	5 	See the interface code table for details. 
requestCode 	Requester code 	Y 	5 	See Requester/Responder Code 
Table for details. 
requestTime 	Request time 	Y 	20 	YYYY-MM-DD HH24:mi:ss 
responseCode 	Return square code 	Y 	5 	See Requester/Responder Code 
Table for details. 
userName 	username 	Y 	20 	 
deviceMAC 		Device 	MAC 
address 	Y 	25 	FFFFFFFFFFFF 
deviceNo 	device ID 	Y 	20 	DSN 
tin 	tin 	Y 	20 	TIN 
brn 	brn 	N 	100 	BRN 

taxpayerID 	taxpayerID 	Y 	20 	taxpayerID 
longitude 	longitude 	Y 	number 	Integer digits cannot exceed 20, decimal digits cannot exceed 8; 
latitude 	latitude 	Y 	number 	Integer digits cannot exceed 20, decimal digits cannot exceed 8; 
agentType 	agentType 	N 	1 	It is not required. The default value is 0. 
0: not agent 
1: agent USSD 
2: Agency Invoicing 
returnCode 	Return Code 	Y 	4 	ReturnCode description 
returnMessage 	Return Message 	N 	Unlimite d 	When the "returnCode" value is 99, the exception information will be assigned to the field. 
extendField 	Extend Field 	N 	Unlimite d 	Reserved as an extension field 
responseDateF ormat 	responseDateForm
at 	Y 	20 	System date format 
responseTimeF ormat 	responseTimeForm
at 	Y 	20 	System time format 
referenceNo 	referenceNo 	N 	20 	Used for T131，T139 ,T109 
operatorName 	operatorName 	N 	150 	T109 basicInformation-->operator 
offlineInvoiceEx ception 	offlineInvoiceExcep tion 	N 	 	Object of offline invoice exception 
itemDescription 	itemDescription 	N 	100 	T109 If there are multiple products, display 	multiple 	products separated by commas, with a maximum display length of 100 characters 
currency 	currency 	N 	10 	T109 basicInformation-->currency 
grossAmount 	grossAmount 	N 	number 	T109 Total amount 
taxAmount 	taxAmount 	N 	number 	T109 Total tax amount 
errorCode 	errorCode 	N 	4 	Error code of offline invoice exception 
errorMsg 	errorMsg 	N 	Unlimite d 	Error 	Msg exception 	of 	offline 	invoice 
ReturnCode description 
Interface Code 	ReturnCode  	Description 
ALL 	99 	Unknow error 
	
Interface code table 
Webservice interface code table 
Interface Name 	Interface Code 	Description 
Get server time 	T101 	 
Client initialization 	T102 	 
log in 	T103 	 
Get symmetric key and signature information 	T104 	 
forget password 	T105 	 
Invoice /Receipt query 	T106 	 
Query Normal Invoice/Receipt 	T107 	 
Invoice details 	T108 	 
Billing upload 	T109 	 
Credit Application 	T110 	 
Credit/Cancel Debit Note 
Application List Query 	T111 	 
Credit Note application detail 	T112 	 
Credit Note issue approval 	T113 	 
Credit Note application cancel 	T114 	 
System dictionary update 	T115 	 
Z-report Daily report upload 	T116 	 
Invoice reconciliation 	T117 	 
Query Credit Note Application and Cancel of Debit Note 
Application Details 	T118 	 
Query Taxpayer Information By 
TIN  	T119 	 

	Void 	Credit 	Debit/Note 
Application 	T120 	 
Acquiring exchange rate 	T121 	 
Query cancel credit note details 	T122 	 
Query Commodity Category 	T123 	 
	Query 	Commodity 	Category 
pagination 	T124 	 
Query Excise Duty 	T125 	 
Get All Exchange Rates 	T126 	 
Goods/Services Inquiry 	T127 	 
Query the stock quantity by goods id 	T128 	 
Batch Invoice Upload 	T129 	 
Goods Upload 	T130 	 
Goods Stock Maintain 	T131 	 
Upload exception log 	T132 	 
TCS 	upgrade 	system 	file download 	T133 	 
	Query 	Commodity 	Category 
	Maintenance 	by 
commodityCategoryVersion 	T134 	 
Get Tcs Latest Version 	T135 	 
Certificate public key upload 	T136 	 
Check type of taxpayer 	T137 	 
Get all branches 	T138 	 
Goods Stock Transfer 	T139 	 
Goods/Services Inquiry by goods 
Code 	T144 	 
Goods Stock recods query 	T145 	 
Query Commodity Category 
/Excise Duty 	T146 	 
Goods Stock recods query 
(Different Condition) 	T147 	 
Goods Stock recods detail query 	T148 	 
Goods Stock Adjust recods query 	T149 	 
Goods Stock Adjust detail query 	T160 	 
Query fuel type 	T162 	EDC 
Upload shift information 	T163 	EDC 
Upload EDC disconnection data 	T164 	EDC 
Update buyer details 	T166 	EDC invoice-change buyer’s info 
EDC Invoice /Receipt inquiry 	T167 	EDC 
Query fuel pump version 	T168 	EDC 
Query fuel pump、fuel nozzle、 fuel tank according to pump number 	T169 	EDC 
Query efd location 	T170 	 
Query EDC UoM exchange rate 	T171 	EDC 
Fuel nozzle status upload 	T172 	EDC 
Query Edc device Version 	T173 	EDC 
Account Creation for USSD 	T175 	USSD 
Upload device issuing status 	T176 	EFD/Offline Enabler 
Negative stock configration inquiry 	T177 	 
1.	Get server time 
Interface Name 	Get server time 
Description 	The Client time should be synchronized with the server time. 
Interface Code 	T101 
Request Encrypted 	N 
Response Encrypted 	N 
Request Message 	Null 
Response Message 	{ 
 	"currentTime": "30/07/2019 15:30:01" 
} 
Flow Description 	Null 
Field description 
Field 	Field Name 	Required 	Length 	Description 
currentTime 	current time 	Y 	20 	dd/MM/yyyy HH:mm:ss 



2.	Client initialization 
Interface Name 	Client initialization 
Description 	Returns the server’s public key 
Interface Code 	T102 
Request Encrypted 	N 
Response Encrypted 	N 
Request Message 	{ 
 
} 	"otp": "100983" 
Response Message 	{ 
 
 
 
} 	"clientPriKey": "vovhW9PY7YUPA98X36BSM8V1OA3gSyF+nTNWAeiVsXMIc", 
"serverPubKey": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQ", 
"keyTable": "OiJ2b3ZoVzlQWTdZVVBBOThYMzZCU004VjFPQTN" 
Flow Description 	1. 
2. 
3. 	The client requests to obtain the client RSA private key. 
The server verifies that tin matches deviceNo and the status is normal. 
Get the private key clientPriKey of the device, call the white box encryption program, encrypt the private key, the white box will return the encrypted clientPriKey and keyTable, and the server will return these two values to the client. 
	4. 	The client receives the data and saves it to the library. 
Field description 
	Field 	Field Name 	Required 	Length 	Description 
otp 		otp 	N 	6 	 
 
 
Field 	Field Name 	Required 	Length 	Description 
clientPriKey 	Encrypted client private key 	Y 	4000 	The private key of the client, used to decrypt the encrypted string returned by the server.  
Only available when appId is 
				‘AP01’ 
serverPubKey 	Server public key 	Y 	4000 	Used to verify the signature returned from the server. 
keyTable 	White box 	Y 	4000 	Used to decrypt the client private key 


3.	Sign in 
Interface Name 	log in 
Description 	Client login 
Interface Code 	T103 
Request Encrypted 	N 	 
Response Encrypted 	Y 
Request Message 	Null 
Response Message 	{ 
 
 	"device": { 
 	"deviceModel": "AE320", 
 	"deviceNo": "20190611", 
 	"deviceStatus": "252", 
 	"deviceType": "1", 
 	"validPeriod": "13/06/2019", 
 	"offlineAmount": "10000000000", 
 	"offlineDays": "90", 
 	"offlineValue": "1000000000000" 
}, 
"taxpayer": { 
 	"id": "112312313213213213", 
 	"tin": "123456", 
 	"ninBrn": "2222", 
 	"legalName": "admin", 
 	"businessName": "1", 
 	"taxpayerStatusId": "101", 
 	"taxpayerRegistrationStatusId": "401", 
 	"taxpayerType": "201",  	"businessType": "501", 
 	"departmentId": "000001", 
 	"contactName": "admin", 
 	"contactEmail": "123@qq.com", 

		 	 	"contactMobile": "18888888888", 
	 	 	"contactNumber": "010-88898888", 
	 	 	"placeOfBusiness": "beijing" 
	 	},  
"taxpayerBranch": { 
	 	 	"branchCode": "02", 
	 	 	"branchName": "Delicious No.2 shop", 
	 	 	"branchType": "101", 
	 	 	"contactName": "admin", 
	 	 	"contactEmail": "123@qq.com", 
	 	 	"contactMobile": "18888888888", 
	 	 	"contactNumber": "010-88898888", 
	 	 	"placeOfBusiness": "beijing" 
	 	}, 
	 	"taxType": [{ 
	 	 	"taxTypeName": "Value Added Tax", 
	 	 	"taxTypeCode": "301", 
 	 	"registrationDate": "04/09/2019",  	 	"cancellationDate": "12/09/2019" 
	 	}, { 
	 	 	"taxTypeName": "Income Tax", 
	 	 	"taxTypeCode": "302", 
 	 	"registrationDate": "04/09/2019",  	 	"cancellationDate": "12/09/2019" 
	 	}], 
"dictionaryVersion": "1", 
"issueTaxTypeRestrictions": "1", 
	 	 "taxpayerBranchVersion": "1", 
	 	 "commodityCategoryVersion": "1", 
	 	 "exciseDutyVersion": "1", 
	 	 "sellersLogo": "1", 
	 	 "whetherEnableServerStock": "1", 
	 	 "goodsStockLimit": "101", 
 	 "exportCommodityTaxRate": "0",  	 "exportInvoiceExciseDuty": "0", 
	 	 "maxGrossAmount": "1000", 
  "isAllowBackDate": "0", 
  "isReferenceNumberMandatory": "0", 
  "isAllowIssueRebate": "0", 
  "isDutyFreeTaxpayer": "0", 
  "isAllowIssueCreditWithoutFDN": "0", 
	 
 
 
} 	 "periodDate": "7", 
 "isTaxCategoryCodeMandatory": "0", 
 "isAllowIssueInvoice": "0", 
 "isAllowOutOfScopeVAT": "0", 
 "creditMemoPeriodDate": "15", 
 "commGoodsLatestModifyVersion": "20210513144600", "financialYearDate": "0701", 
 "buyerModifiedTimes": "1", 
 "buyerModificationPeriod": "48", 
 "agentFlag": "0", 
 "webServiceURL": "https://api.ura.go.ug/efris/1.0/", 
 "environment": "0", 
 "frequentContactsLimit": "40", 
 "autoCalculateSectionE": "1", 
"autoCalculateSectionF": "1", 
"hsCodeVersion": "5", 
"issueDebitNote": "0", 
"qrCodeURL": "https://******" 
Flow Description 	
1. 
2. 	Return taxpayer information, device information 
For the first login, the dictionaryVersion exists locally. The second comparison compares the local dictionaryVersion with the dictionaryVersion. If the dictionaryVersion is greater than the local dictionaryVersion, the T115 interface is called to update the dictionary information. If it is equal, it is not necessary to call T115. 
Field description 
Field 	Field Name 	Required 	Length 	Description 
 	device 			
deviceModel 	Equipment model 	Y 	50 	 
deviceNo 	Device number 	Y 	50 	 
deviceStatus 	equipment status 	Y 	3 	Corresponding dictionary deviceStatus 
offlineAmount 	The maximum number of invoices that can be issued 	Y 	Number 	 
offlineDays 	Offline limit days 	Y 	Number 	 
offlineValue 	The 	maximum 	Y 	Number 	 

		invoice 	amount 
that can be issued 			
deviceType 	Equipment type 	Y 	3 	 
validPeriod 	Equipment expiration date 	Y 	Date 	 
taxpayer 
id 	Taxpayer ID 	Y 	18 	 
tin 	TIN 	Y 	50 	 
ninBrn 	ninBrn 	Y 	100 	 
legalName 	taxpayer name 	Y 	500 	 
businessName 	taxpayer name 	Y 	500 	 
businessType 	business type 	Y 	50 	Corresponding dictionary businessType 
taxpayerStatusI d 	Taxpayer status 	Y 	18 	Corresponding dictionary taxpayerStatus 
taxpayerRegistr ationStatusId 	Taxpayer registration status 	Y 	18 	Corresponding dictionary registrationStatus 
taxpayerType 	Taxpayer type 	Y 	18 		Corresponding 	dictionary 
taxpayerType 
departmentId 	Organization ID 	Y 	18 	 
contactEmail 	mailbox 	Y 	50 	 
contactMobile 	contact number 	Y 	50 	 
contactNumber 	Landline 	Y 	30 	 
contactName 	Contact 	Y 	100 	 
placeOfBusines
s 	Business place 	Y 	500 	 
taxpayerBranch 
branchCode 	Branch code 	N 	50 	 
branchName 	Branch name 	N 	500 	 
branchType 	Branch type 	N 	100 	Corresponding dictionary branchType 
contactEmail 	mailbox 	N 	50 	 
contactMobile 	contact number 	N 	60 	 
contactNumber 	Landline 	N 	50 	 
contactName 	Contact 	N 	100 	 
placeOfBusines
s 	Business place 	N 	1000 	 
taxType 
taxTypeName 	Tax type name 	Y 	200 	 
taxTypeCode 	Tax type 	Y 	50 	Corresponding dictionary taxType 
registrationDat	effective date 	Y 	Date 	 

e 				
cancellationDat e 	Obsolete date 	Y 	Date 	 
 
dictionaryVersi on 	Dictionary version 	Y 	Number 	 
issueTaxTypeRe
strictions 	issueTaxTypeRestri ctions 	Y 	1 	0:No 1:Yes 
taxpayerBranch Version 	taxpayerBranchVer sion 	Y 	20 	 
commodityCate goryVersion 	commodityCategor yVersion 	Y 	10 	 
exciseDutyVersi on 	exciseDutyVersion 	Y 	10 	 
sellersLogo 	Sellers Logo 	Y 	Unlimit ed 	Base64 content 
goodsStockLimi
t 	goodsStockLimit 	Y 	3 	101: restricted, inventory cannot be negative  
102: unlimited, inventory can be negative 
exportCommod
ityTaxRate 	exportCommodityT axRate 	Y 	Number 	If the tax rate is 1%, deposit 0.01 
exportInvoiceEx ciseDuty 	exportInvoiceExcise Duty 	Y 	1 	0:No 1:Yes 
maxGrossAmou
nt 	maxGrossAmount 	Y 	Number 	Max Gross Amount for 
Invoice(UGX) 
 
isAllowBackDa te 	isAllowBackDate 	Y 	1 	0 - no past time allowed, 1 - past time allowed. The default value is 0. When the taxpayer is in the list 
maintained by the office and is valid, the value is 1 
isReferenceNu mberMandatory 	isReferenceNumbe rMandatory 	Y 	1 	0:No 1:Yes 
isAllowIssueR ebate 	isAllowIssueReba te 	Y 	1 	default value is 0-not allowed. When the seller is in the list and valid, the value is 1-allowed. 
isDutyFreeTax payer 	isDutyFreeTaxpay er 	Y 	1 	If the taxpayer is in the list and valid, and the 

				taxpayer has no consumption tax, the value is 1, otherwise it is 0 
isAllowIssueC reditWithoutF
DN 	isAllowIssueCred itWithoutFDN 	Y 	1 	If the taxpayer is in the list and valid, and the taxpayer has no consumption tax, the value is 1, otherwise it is 0 
periodDate 	periodDate 	Y 	Number 	From the system parameter, if not, the default value is 7 
isTaxCategory
CodeMandatory 	isTaxCategoryCod eMandatory 	Y 	1 	0:No 1:Yes 
isAllowIssueI nvoice 	isAllowIssueInvo ice 	Y 	1 	0:No 1:Yes 
isAllowOutOfS copeVAT 	isAllowOutOfScop eVAT 	Y 	1 	0:No 1:Yes 
creditMemoPer iodDate 	creditMemoPeriod
Date 	Y 	Number 	From the system parameter, if not, the default value is 15 
commGoodsLate stModifyVersi on 	commGoodsLatestM odifyVersion 	Y 	14 	 
financialYear Date 	financialYearDat e 	Y 	4 	 
buyerModified
Times 	buyerModifiedTim es 	Y 	Number 	From the system parameter, if not, the default value is 1 
buyerModifica tionPeriod 	buyerModificatio nPeriod 	Y 	Number 	From the system parameter, if not, the default value is 48 
hours 
agentFlag 	agentFlag 	Y 	1 	0:No 1:Yes 
webServiceURL 	webServiceURL 	Y 	200 	 
environment 	environment 	Y 	1 	0:Production; 
1:Test 
frequentConta ctsLimit 	frequentContacts
Limit 	Y 	Number 	From system parameter, the default value is 40 
autoCalculate
SectionE 	autoCalculateSec tionE 	Y 	1 	0:No 1:Yes 
hsCodeVersion 	HS Code version 	Y 	Number 	 
issueDebitNot e 	Is invoicing debit note allowed when a credit note is 	Y 	1 	0:No 1:Yes 
	partially issued 			
qrCodeURL 	Invoice verification 
page 	prefix 
address 	Y 	200 	https://efris.ura.go.ug/site_ mobile/#/invoiceValidation 




4.	Obtaining Symmetric Key and Signature 
Interface Name 		Get symmetric key and signature information – Used only for those with online 	
		mode	 	
Description 	Get symmetric key and signature information 
Interface Code 	T104 
Request Encrypted 	N 
Response Encrypted 	N 
Request Message 	Null 
Response Message 	{ 
 	"passowrdDes": "12345678", 
 	"sign": "213456" 
} 
Flow Description 	1.	The client gets a symmetric key every time you log in, and all subsequent encryption is encrypted by symmetric key. 
2.	The server randomly generates an 8-bit symmetric key and a signature value for encryption. 
Field description 
Field 	Field Name 	Required 	Length 	Description 
passowrdDes 	Encrypted symmetric key 	Y 	Unlimit ed 	Used to encrypt and decrypt all data after login 
sign 	Signature value 	Y 	Unlimit ed 	 




5.	Forget Password 
Interface Name 	forget password 
Description 	forget password 
Interface Code 	T105 
Request Encrypted 	Y 
Response Encrypted 	N 
Request Message 	{ 
 	"userName": "admin", 
 	"changedPassword": "123456" 
} 
Response Message 	Null 
Flow Description 	1. The enterprise user forgets the password, resubmits the password 
corresponding to the user name, and finds the enterprise user email to send the account information. 
Field description 
Field 	Field Name 	Required 	Length 	Description 
userName 	username 	Y 	200 	 
changedPassw ord 	Modified password 	Y 	200 	 




6.	Invoice /Receipt query 
Interface Name 	Invoice inquiry 
Description 	Query all invoice information（Invoice/receipt, credit note, debit note, cancel credit note, cancel debit note） 
Interface Code 	T106 
Request Encrypted 	Y 	
Response Encrypted 	Y 	
Request Message 	{ 
 
 
 	"oriInvoiceNo": "00000000002", 
"invoiceNo": "00000000001", 
"deviceNo": "00031000092", 
"buyerTin": "7777777777", 
"buyerNinBrn": "00000000001", 
"buyerLegalName": "lisi", 
"combineKeywords": "7777777", 

	 
 
} 	"invoiceType": "1", 
"invoiceKind": "1", 
"isInvalid": "1", 
"isRefund": "1", 
"startDate": "2019-06-14", 
"endDate": "2019-06-15", 
"pageNo": "1", 
"pageSize": "10", 
"referenceNo": "425502528294126235", 
"branchName": "Mr. HENRY KAMUGISHA", 
"queryType": "1", 
"dataSource": "101", 
"sellerTinOrNin": "1009837013", 
"sellerLegalOrBusinessName": "CLASSY TRENDS BOUTIQUE"  
Response Message 	{ 
 
 
 	"page": { 
	 	"pageNo": "1", 
	 	"pageSize": "10", 
	 	"totalSize": " Total number of articles ", 
	 	"pageCount": "total pages" 
}, 
"records": [{ 
	 	"id": "159078217852531032", 
	 	"invoiceNo": "00000000001", 
	 	"oriInvoiceId": "00000000003", 
	 	"oriInvoiceNo": "00000000002", 
	 	"issuedDate": "15/06/2019 02:00:00", 
	 	"buyerTin": "7777777777", 
	 	"buyerLegalName": "test", 
	 	"buyerNinBrn": "00000000001", 
	 	"currency": "UGX", 
	 	"grossAmount ": "2000.00", 
	 	"taxAmount ": "2000.00", 
	 	"dataSource": "101", 
	 	"isInvalid": "1", 
"isRefund": "1", 
"invoiceType": "1", 
"invoiceKind": "1", 
	 	"invoiceIndustryCode": "102", 
	 
 
}, { 
 
 	"branchName": "Mr. RAJIV DINESH GANDHI", 
"deviceNo": "121241304906446273", 
"uploadingTime": "15/06/2019 02:00:00", 
"referenceNo": "00000000012", 
"operator": "administrator", 
"userName": "Mr. ANDREW KIIZA" 
"id": "159078217852531032", 
"invoiceNo": "00000000001", 
"oriInvoiceId": "00000000004", 
"oriInvoiceNo": "00000000002", 
"issuedDate": "15/06/2019 02:00:03", 
"buyerTin": "7777777777", 
"buyerLegalName": "test", 
"buyerNinBrn": "00000000001", 
"currency": "UGX", 
"grossAmount ": "2000.00", 
"taxAmount ": "2000.00", 
"dataSource": "101", 
"isInvalid": "1", 
"isRefund": "1", 
"invoiceType": "1", 
"invoiceKind": "1", 
"invoiceIndustryCode": "102", 
"branchName": "Mr. RAJIV DINESH GANDHI", 
"deviceNo": "121241304906446273", 
"uploadingTime": "15/06/2019 02:00:00", 
"referenceNo": "00000000012", 
"operator": "administrator", 
"userName": "Mr. ANDREW KIIZA" 
	 
} 	}] 

Flow Description 	The data is arranged in reverse order according to the date of issue. Only query the seller Tin equal to (the outer packet gets Tin) 
Field description 
Field 	Field Name 	Required 	Length 	Description 
invoiceNo 	Invoice number 	N 	20 	The query debitnote corresponds to the Invoice No. of the positive 

				ticket 
deviceNo 	Device No 	N 	20 	 
oriInvoiceNo 	oriInvoiceNo 	N 	20 	 
buyerTin 	Buyer TIN 	N 	10 	 
buyerNinBrn 	Buyer NinBrn 	N 	100 	 
buyerLegalNam
e 	Buyer name 	N 	256 	 
combineKeywo
rds 	EFD query conditions 	N 	20 	 
invoiceType 	invoice type 	N 	1 	1:Invoice/Receipt 
2:Credit Note 
5:Credit Memo 
4:Debit Note 
 Corresponding dictionary table invoiceType 
 Support multiple condition. 
Separated by commas, 
Eg: invoiceType = '2,5' 
invoiceKind 	invoice kind 	Y 	1 	1: Invoice, 2: Receipt 
isInvalid 	Obsolete sign 	N 	1 	Obsolete sign 1: Obsolete 0: Not invalid Note: Obsolete only for 
negative and supplementary 
tickets 
isRefund 	Is it open to a credit note/Debit 
Note 	N 	1 	Whether it is opened for a ticket / 
Debit Note: 0 - not issued a negative ticket / Debit 1- is issued 
Credit 2- is issued Debit 
startDate 	start date 	N 	Date 	yyyy-MM-dd 
endDate 	End date 	N 	Date 	yyyy-MM-dd 
pageNo 	current page number 	Y 	10 	 
pageSize 	How many records are displayed per page 	Y 	3 	Cannot be greater than the integer 100 
referenceNo 	referenceNo 	N 	50 	Seller‘s Reference No. 
branchName 	branchName 	N 	500 	 
queryType 	queryType 	N 	1 	QueryType, can be empty, the value is 1/0, and the default value is 1. 
				 
1: Query output invoices,  
0: Query input invoices. 
 
If QueryType is 0,buyerTin、 buyerNinBrn、buyerLegalName must be empty 
dataSource 	dataSource 	N 	3 	dataSource can be empty 
 
101: EFD 
102: Windows Client APP 
103: WebService API 
104: Mis 
105: Webportal 
106: Offline Mode Enabler 
107:USSD 
108:ASK URA 
 
sellerTinOrNi n 	sellerTinOrNin 	N 	100 	agent inquiry 
sellerLegalOr BusinessName 	sellerLegalOrBus inessName 	N 	256 	agent inquiry 
 
Field 	Field Name 	Required 	Length 	Description 
id 	Invoice ID 	Y 	32 	 
invoiceNo 	Invoice number 	Y 	30 	 
oriInvoiceId 	Original invoice ID 	Y 	32 	 
oriInvoiceNo 	Original invoice number 	Y 	30 	 
issuedDate 	Billing date 	Y 	Date 	 
businessName 	business name 	Y 	256 	 
buyerTin 	Buyer TIN 	 	10-20 	 
buyerLegalNam
e 	Buyer name 	Y 	256 	 
taxAmount  	tax 	Y 	Number 	 
buyerNinBrn 	Buyer NinBrn 	Y 	100 	 
currency 	Currency 	Y 	10 	 
grossAmount 	total amount 	Y 	Number 	 
dataSource 	Data Sources 	Y 	3 	101:EFD 
102:Windows Client APP 
103:WebService API 

					104:Mis 
105:Webportal 
106:Offline Mode Enabler 
invoiceType 	invoice type 		Y 	1 	1:Invoice/Receipt 
2:Credit Note 
5:Credit Memo 
4:Debit Note 
 Corresponding dictionary table invoiceType 
invoiceKind 	invoice kind 		Y 	1 	1 :Invoice 2: Receipt 
isInvalid 	Obsolete sign 		Y 	1 	Obsolete sign 1：obsolete 0：Not obsolete  Note: Obsolete only for positive and supplementary tickets 
isRefund 	Is it open to a credit note/Debit 
Note 		N 	1 	Whether it is opened for a ticket / 
Debit Note: 0 - not issued a negative ticket / Debit 1- is issued 
Credit 2- is issued Debit 
pageNo 	current page number 		Y 	10 	 
pageSize 	How many records are displayed per page 		Y 	3 	 
totalSize 	Total number of articles 		Y 	10 	 
pageCount 	total pages 		Y 	10 	 
invoiceIndustry Code 	invoiceIndustryCod e 		N 	3 	101:General Industry 
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
branchName 	branchName 	N 		500 	 
deviceNo 	deviceNo 	Y 		50 	 
uploadingTime 	uploadingTime 	Y 		Date 	 
referenceNo 	referenceNo 	N 		50 	Seller's Reference No. 
operator 	operator 	N 	100 	 
userName 	userName 	N 	500 





7.	Query Normal Invoice/Receipt  
Interface Name 	Apply for invoice inquiry 
Description 	Query all Invoice/Receipt invoice information that can be issued with Credit Note, Cancel Debit Note 
Interface Code 	T107 
Request Encrypted 	Y 	
Response Encrypted 	Y 	
Request Message 	{ 
 
 
} 	"invoiceNo": "00000000001", 
"deviceNo": "00031000092", 
"buyerTin": "7777777777", 
"buyerLegalName": "lisi", 
"invoiceType": "1", 
"startDate": "2019-06-14", 
"endDate": "2019-06-15", 
"pageNo": "1", 
"pageSize": "10", 
"branchName": "Mr. HENRY KAMUGISHA" 
Response Message 	{ 
 
 
 	"page": { 
 	"pageNo": "1", 
 	"pageSize": "10", 
 	"totalSize": "Total number of articles", 
 	"pageCount": "total pages" 
}, 
"records": [{ 
 	"id": "159078217852531032", 
 	"invoiceNo": "00000000001", 
 	"oriInvoiceId": "00000000004", 
 	"oriInvoiceNo": "00000000005", 
 	"issuedDate": "15/06/2019 02:00:04", 
 	"buyerTin": "7777777777", 
 	"buyerBusinessName": "aisino", 
 	"buyerLegalName": "test", 
	 
 
} 	 	"tin": "8888888888", 
 	"businessName": "aisino1", 
 	"legalName": "test", 
 	"currency": "UGX", 
 	"grossAmount ": "2000.00", 
 	"dataSource": "101" 
}, { 
 	"id": "159078217852531032", 
 	"invoiceNo": "00000000001", 
 	"oriInvoiceId": "00000000004", 
 	"issuedDate": "15/06/2019 02:04:05", 
 	"buyerTin": "7777777777", 
 	"buyerBusinessName": "aisino", 
 	"buyerLegalName": "test", 
 	"currency": "UGX", 
 	"grossAmount ": "2000.00", 
 	"dataSource": "101" 
}] 


Flow Description 	1.	Display the positive invoices that the current taxpayer has opened, and filter out the current positive invoices without submitting a credit note or Debit note application, and Not obsolete 
2.	The data is arranged in reverse order according to the date of issue. 
3.	Only query the seller Tin equal to (the outer packet gets Tin) 
Field description 
Field 	Field Name 	Required 	Length 	Description 
invoiceNo 	Invoice number 	N 	20 	 
deviceNo 	Device No 	N 	20 	 
buyerTin 	Buyer TIN 	N 	100 	 
buyerLegalNam
e 	Buyer Legal Name 	N 	20 	 
invoiceType 	invoice type 	N 	1 	1:invoice 4:debit 
startDate 	start date 	N 	20 	yyyy-MM-dd 
endDate 	End date 	N 	20 	yyyy-MM-dd 
pageNo 	current page number 	Y 	10 	 
pageSize 	How many records are displayed per page 	Y 	3 	Cannot be greater than the integer 100 
branchName 	branchName 	N 	500 	 
 
Field 	Field Name 	Required 	Length 	Description 
id 	Invoice ID 	Y 	32 	 
invoiceNo 	Invoice number 	Y 	20 	 
oriInvoiceId 	Original Invoice ID 	Y 	32 	 
oriInvoiceNo 	oriInvoiceNo 	Y 	20 	 
issuedDate 	Billing date 	Y 	Date 	 
buyerTin 	Buyer TIN 	Y 	10-20 	 
buyerBusinessN ame 	business name 	Y 	256 	 
buyerLegalNam
e 	Buyer Legal Name 	Y 	256 	 
tin 	Seller TIN 	Y 	10-20 	 
businessName 	Seller business 
Name 	  Y 	256 	 
legalName 	Seller legalName 	Y 	256 	 
currency 	currency 	Y 	10 	 
grossAmount 	Gross Amount 	Y 	Number 	 
dataSource 	Data Source 	Y 	3 	101:EFD 
102:Windows Client APP 
103:WebService API 
104:Mis 
105:Webportal 
106:Offline Mode Enabler 
pageNo 	current page number 	Y 	10 	 
pageSize 	How many records are displayed per page 	Y 	3 	 
totalSize 	Total number of 
articles 	Y 	10 	 
pageCount 	total pages 	Y 	10 	





8.	Invoice details 
Interface Name 	Invoice details 

Description 	Invoice details are queried according to Invoice number. 
Interface Code 	T108 
Request Encrypted 	Y 	
Response Encrypted 	Y 	
Request Message 	{ 
 
} 	"invoiceNo": "22598049632407113016" 
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
	 	"oriInvoiceNo": "00000000002", 
	 	"antifakeCode": "201905081711", 
	 	"deviceNo": "201905081234", 
	 	"issuedDate": "08/05/2019 17:13:12", 
	 	"oriIssuedDate": "08/05/2019 17:13:12", 
	 	"oriGrossAmount": "9247", 
	 	"operator": "aisino", 
	 	"currency": "UGX", 
	 	"oriInvoiceId": "1", 
	 	"invoiceType": "1", 
	 	"invoiceKind": "1", 
	 	"dataSource": "101", 
	 	"isInvalid": "1", 
"isRefund": "1", 

		 	 	"invoiceIndustryCode": "102", 
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
"invoiceItemId": "231242354564645214", 
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
	 	 	"categoryId": "5648", 
	 	 	"categoryName": "Test", 
	 	 	"goodsCategoryId": "5673", 
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
  "totalWeight": "11", 
  "hsCode": "860210", 
  "hsName": "Diesel-electric locomotives", 
  "pieceQty": "20", 
  "pieceMeasureUnit": "101" 
	 	}, { 
"invoiceItemId": "231242354564645215", 
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
  	"categoryId": "2", 
"categoryName": "Test", 
"goodsCategoryId": "5673", 
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
"totalWeight": "11", 
"hsCode": "860210", 
"hsName": "Diesel-electric locomotives", 
"pieceQty": "20", 
"pieceMeasureUnit": "101" 
		 	}], 
	 	"tax
 	
 	 	Details": [{ 
"taxCategoryCode": "01", 
"netAmount": "3813.55", 
"taxRate": "0.18", 
"taxAmount": "686.45", 
"grossAmount": "4500.00", 
"exciseUnit": "101", 
"exciseCurrency": "UGX", 
"taxRateName": "123" 
		 	}, { 
 	 
 	 
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
"custom": { 
	 	 	"sadNumber": "8379", 
	 	 	"office": "Busia", 
	 	 	"cif": "cif", 
	 	 	"wareHouseNumber": "5", 
	 	 	"wareHouseName": " Busia ", 
	 	 	"destinationCountry": " China ", 
	 	 	"originCountry": " China", 
	 	 	"importExportFlag": "1", 
	 	 	"confirmStatus": "0", 
	 	 	"valuationMethod": "asdfghjkl", 
	 	 	"prn": "1" 
}, 
"importServicesSeller": { 
	 	 	"importBusinessName": "lisi", 
	 	 	"importEmailAddress": "123456@163.com", 
	 	 	"importContactNumber": "15501234567", 
	 	 	"importAddress": "beijin", 

	 	 	"importInvoiceDate": "2020-09-05",  	 	"importAttachmentName": "test",  	 	"importAttachmentContent": 
"MIIDFjCCAf6gAwIBAgIRAKPGAol9CEdpkIoFa8huM6zfj1WEBRxteoo6PH46 un4FGj4N6ioIGzVr9G40uhQGdm16ZU+q44XjW2oUnI9w=" 
 
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
 "mvrn":"", 
 "updateTimes":"0" 
}, 
"agentEntity": { 
  "tin": "1009837013", 
  "legalName": "Mr. STEPHEN BUNJO", 
  "businessName": "CLASSY TRENDS BOUTIQUE", 
  "address": "KITUNZI LUNGUJJA KAMPALA RUBAGA DIVISION 
NORTH" 
}, 
"creditNoteExtend": { 
  "preGrossAmount": "9247", 
  "preTaxAmount": "868", 
  "preNetAmount": "8379" 
 } 
 
} 
Flow Description 	Invoice details are queried according to Invoice number. 
Field description 
Field 	Field Name 	Required 	Length 	Description 
invoiceNo 	Invoice number 	Y 	20 	Fiscal document number 
 
Seller InformationInternal field: 
Field 	Field Name 	Required 	Length 	Description 
tin 	sellerTIN 	Y 	10-20 	 
ninBrn 	sellerNIN/BRN 	Y 	100 	 
passportNumb
er 	Passport number 	Y 	20 	 
legalName 	Legal Name 	Y 	256 	 
businessName 	Business Name 	Y 	256 	 
Adress 	seller Adress 	Y 	500 	 
mobilePhone 	Mobile Phone 	Y 	30 	 
linePhone 	Line Phone 	Y 	30 	 
emailAddress 	Seller email 	Y 	50 	 
placeOfBusines
s 	Place Of Business 	Y 	500 	 
referenceNo 	referenceNo 	Y 	50 	 
branchId 	branchId 	Y 	18 	 
branchName 	branchName 	Y 	500 	 
branchCode 	branchCode 	Y 	50 	 
 
	Basic InformationInternal field:  	 
Field 	Field Name 	Required 	Length 	Description 
invoiceId 	Invoice ID 	Y 	32 	 
invoiceNo 	Invoice number 	Y 	20 	Fiscal document number 
oriInvoiceNo 	Original Invoice number 	Y 	20 	 
antifakeCode 	Antifake Code 	Y 	20 	Digital signature(20 digits) 
deviceNo 	device Number 	Y 	20 	Device Number (20 digits) 
issuedDate 	Invoice issued Date 	Y 	date 	date(DD/MM/YYYY HH24:mm:ss) stamp 
oriIssuedDate 	Original Invoice issued Date 	Y 	date 	date(DD/MM/YYYY HH24:mm:ss) stamp 
oriGrossAmount 	Original invoice amount 	Y 	number 	 
operator 	Operator 	Y 	150 	 
currency 	currency 	Y 	10 	UGX 
oriInvoiceId 	Original Invoice ID 	N 	32 	When the credit is opened, it is the original invoice number. When the ticket is opened, it is empty. 
invoiceType 	Invoice Type 	Y 	1 	1:Invoice/Receipt 
2:Credit Note 
5:Credit Memo 
4:Debit Note 
 Corresponding dictionary table invoiceType 
invoiceKind 	Invoice Kind 	Y 	1 	1 :invoice 2: receipt 
dataSource 	Data Source 	Y 	3 	101:EFD 
102:Windows Client APP 
103:WebService API 
104:Mis 
105:Webportal 
106:Offline Mode Enabler 
107:USSD 
108:ASK URA 
 
isInvalid 	Obsolete sign 	N 	1 	Obsolete sign  
				1: Obsolete  
0: Not invalid Note:  
Obsolete only for negative and supplementary tickets 
isRefund 	Is it open to a credit note/Debit 
Note 	N 	1 	Whether it is opened for a ticket / Debit Note:  
0 - not issued a negative ticket / 
Debit  
1-	is issued Credit  
2-	is issued Debit 
invoiceIndustryC ode 	invoiceIndustryCo de 	N 	3 	101:General Industry 
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
currencyRate 	currencyRate 	Y 	Number 	 
 
Buyer Details Internal field : 
Field 	Field Name 	Required 	Length 	Description 
buyerTin 	Buyer TIN 	Y 	10-20 	 
buyerNinBrn 	Buyer NIN 	Y 	100 	 
buyerPassport Num 	Passport number 	Y 	20 	 
buyerLegalNam
e 	Legal name 	Y 	256 	 
buyerBusinessN ame 	Business name 	Y 	256 	 
buyerAddress 	Buyer Address 	Y 	500 	 
buyerEmail 	Buyer Email 	Y 	50 	 
buyerMobilePh one 	Buyer Mobile Phone 	Y 	30 	 
buyerLinePhon e 	Buyer Line Phone 	Y 	30 	 
buyerPlaceOfB
usi 	Buyer business place 	Y 	500 	 
buyerType 	Buyer Type 	Y 	1 	0	: B2B  
1	: B2C 
2	: Foreigner 
3	: B2G 
buyerSector 	Buyer Sector 	N 	200 	 
buyerReference No 	Buyer ReferenceNo 	N 	50 	EFD and CS ignore this field, only used for Webservice. 
 
Buyer Extend field: 
Field 	Field Name 	Required 	Length 	Description 
propertyType 	Property type 	N 	50 	 
district 	District 	N 	50 	 
municipalityCo unty 	Country or Municipality 	N 	50 	 
divisionSubcou nty 	Division or Sub county 	N 	50 	 
town 	town 	N 	 50 	 
cellVillage 	cell or village 	N 	60 	 
effectiveRegistr ationDate 	Effective registration  date 	N 	Date 	The time format must be yyyy-
MM-dd 
meterStatus 	Status of the meter (active or in active) 	N 	3 	101:active 
102:in active 
 
Goods Details Internal field: 
Field 	Field Name 	Required 	Length 	Description 
invoiceItemId 	line item id 	Y 	18 	 
item 	item name 	Y 	200 	 
itemCode 	item code 	Y 	50 	 
qty 	Quantity 	Y 	Number 	 
unitOfMeasure 	unit of measure 	Y 	3 	from T115 rateUnit -->value 
Required if discountFlag is 1 or 2 
unitPrice 	unit Price 	Y 	Number 	 
total 	Total prise 	Y 	Number 	 
taxRate 	tax rate 	Y 	Number 	Save decimals, such as 18% deposit 
0.18 
tax 	tax 	Y 	Number 	 
discountTotal 	discount total 	Y 	Number 	 
discountTaxRat e 	discount tax rate 	Y 	Number 	Save decimals, such as 18% deposit 
0.18 
orderNumber 	order number 	Y 	Number 	 
discountFlag 	Whether the product line is discounted 	Y 	1 	1: discount 2: non-discount 
deemedFlag 	Whether deemed 	Y 	1 	1 : deemed   2: not deemed 
exciseFlag 	Whether excise 	Y 	1 	1 : excise   2: not excise 
categoryId 	exciseDutyCode 	Y 	18 	exciseDutyCode 
categoryName 	Excise Duty category name 	Y 	1024 	 
goodsCategory
Id 	goods Category id 	Y 	18 	VAT tax commodity classification, currently stored is taxCode 
goodsCategory Name 	goods Category Name 	Y 	200 	 
exciseRate 	Excise tax rate 	Y 	21 	 
exciseRule 	Excise Calculation Rules 	Y 	1 	1: Calculated by tax rate  
2 Calculated by Quantity 
Corresponding dictionary rateType 
exciseTax 	Excise tax 	Y 	Number 	 
pack 	pack 	Y 	Number 	 
stick 	stick 	Y 	Number 	 
exciseUnit 	exciseUnit 	Y 	3 	 
exciseCurrency 	exciseCurrency 	Y 	10 	 
exciseRateNam
e 	exciseRateName 	Y 	500 	 
vatApplicable Flag 	vatApplicableFla g 	N 	1 	It is not required.  
The default value is 1. 
0 when using VAT out of scope 
deemedExemptC ode 	deemedExemptCode 	N 	3 	101:Deemed 
102:Exempt 
vatProjectId 	vatProjectId 	N 	18 	Required if deemed flag is 1 
vatProjectNam e 	vatProjectName 	N 	100 	Required if deemed flag is 1 
totalWeight 	Total Weight 	N 	Number 	totalWeight is required when 
invoice/receipt is export 
hsCode 	HS Code 	N 	50 	 
hsName 	HS Name 	N 	1000 	 
pieceQty 	Piece Quantity 	N 	Number 	 
pieceMeasureU nit 	Piece Measure 
Unit 	N 	3 	This code is from dictionary table, code type is rateUnit 
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
11: VAT out of Scope 
netAmount  	net amount 	Y 	number 	 
taxRate 	tax rate 	Y 	number 	Save decimals, such as 18% deposit 
0.18 
taxAmount 	tax 	Y 	number 	 
grossAmount 	gross amount 	Y 	number 	 
exciseUnit 	exciseUnit 	Y 	3 	 
exciseCurrency 	exciseCurrency 	Y 	10 	 
taxRateName 	taxRateName 	N 	100 	 
 
SummaryInternal field: 
Field 	Field Name 	Required 	Length 	Description 
netAmount 	 net amount  	Y 	 number 	Tax Receipt total net amount  
taxAmount  	 tax amount 	Y 	number 	Tax Receipt total tax amount 
grossAmount 	 gross amount 	Y 	number 	Tax Receipt total gross amount 
oriGrossAmoun
t 	original invoice 
gross amount 	N 	number 	 
itemCount 	Purchase item lines 	Y 	4 	Purchase item lines 
mode 	mode 	Y 	1 	Issuing receipt mode (1:Online or 
0:Offline) ,this code is from dictionary table 
remarks 	Remarks 	Y 	500 	 
qrCode 	qrCode 	Y 	500 	 
 
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
Integer digits cannot exceed 16 
orderNumber 	orderNumber 	Y 	1 	Sort by lowercase letters, such as a, b, c, d, etc. 
 
Extend Internal field: 
Field 	Field Name 	Required 	Length 	Description 
reason 	Cancel reason 	N 	1024 	 
reasonCode 	Refund reason code 	N 	3 	If invoiceType is 2,use the following values: 
101: Return of products due to expiry or damage, etc.  
102: Cancellation of the purchase. 103: 	Invoice 	amount 	wrongly stated due to miscalculation of price, tax, or discounts, etc. 
104: Partial or complete waive off of the product sale after the invoice is generated and sent to customer. 
105: Others (Please specify); 
 
If invoiceType is 4, use the following values: 
 101:Increase in the amount payable/invoice value due to extra products delivered or products delivered charged at an incorrect value. 102:Buyer asked for a new debit note. 
103:Others (Please specify);  
				If invoiceType is 5, use the following values: 
 
101:Trade discount 
102:Rebate 
103:Others(Please specify) 
 
 
Custom field: 
Field 	Field Name 	Required 	Length 	Description 	
sadNumber 	SAD Number 	Y 	20 	SAD Number(20 digits) 	
office 	office 	Y 	35 	office for example busia 	
cif 	cif 	Y 	50 	CIF 	
wareHouseNu mber 	Ware housing Number 	Y 	16 	 	
wareHouseNa me 	Ware housing Name 	Y 	256 	 	
destinationCou ntry 	destinationCountry 	Y 	256 	 	
originCountry 	originCountry 	Y 	256 	 	
importExportFla g 	importExportFlag 	Y 	1 	1 import  
2.export 	
confirmStatus 	confirmStatus 	Y 	1 	0:Unconfirmed,Taxpayers 	cannot stock-in; 
1:Confirmed, Taxpayers can stockin; 
2:Cancelled,Cancellation status and the invoice is invalid 
valuationMetho d 	Valuation Method 	Y 	128 	 valuation method 
prn 	prn 	Y 	80 	 
 
ImportServicesSeller field: 
Field 	Field Name 	Required 	Length 	Description 
importBusiness Name 	Import BusinessName 	N 	500 	invoiceIndustryCode is equal to 104, importbusinessname cannot be empty 
importEmailAd dress 	Import EmailAddress 	N 	50 	 
importContact Number 	Import ContactNumber 	N 	30 	 
importAddress 	Import Address 	N 	500 	invoiceIndustryCode is equal to 
104, importAddress cannot be empty 
importInvoiceD ate 	importInvoiceDate 	Y 	date 	yyyy-MM-dd 
importAttachm entName 	importAttachment Name 	 	 N 	256 	importAttachmentName eg: test.png 
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
qty 	Quantity 	Y 	Number 	 
unitOfMeasure 	unit of measure 	Y 	3 	from T115 rateUnit -->value Required if discountFlag is 1 or 2 
unitPrice 	unit Price 	Y 	Number 	 
total 	total price 	Y 	Number 	 
taxRate 	tax rate 	N 	Number 	 
tax 	tax 	N 	Number 	 
discountTotal 	discount total 	N 	Number 	must be empty when 
discountFlag is 0 or 2 
must be negative when discountFlag is 1 And equal to the absolute value of the total of the discount line 
discountTaxRa	discount tax 	N 	Number 	Save decimals, such as 18% 

te 	rate 			deposit 0.18 
Decimal places must not exceed 5 
orderNumber 	order number 	Y 	Number 	Add one each time from zero 
discountFlag 	Whether the product line is discounted 	N 	1 	0:discount amount 1:discount good, 2:non-discount good 
The first line cannot be 0 and the last line cannot be 1 
deemedFlag 	Whether deemed 	N 	1 	1 : deemed 2: not deemed 
exciseFlag 	Whether excise 	N 	1 	1 : excise  2: not excise 
categoryId 	exciseDutyCode 	N 	18 	Excise Duty id 
Required when exciseFlag is 1 
categoryName 	Excise Duty category name 	N 	1024 	Required when exciseFlag is 1 
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
exciseTax 	Excise tax 	N 	number 	 
pack 	pack 	N 	number 	 
stick 	stick 	N 	number 	 
exciseUnit 	exciseUnit 	N 	3 	101	per stick 
102	per litre 
103	per kg 
104	per user per day of access 
105	per minute 
106	per 1,000sticks 
107	per 50kgs 
108	- 109 per 1 g 
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
creditNoteExtend field: 
Field 	Field Name 	Required 	Length 	Description 
preGrossAmoun t 	  gross amount  	N 	 number 	Original Invoice/Receipt total gross amount  
preTaxAmount 	 tax amount 	N 	number 	Original Invoice/Receipt  total tax amount 
preNetAmount 	net amount 	N 	number 	Original Invoice/Receipt  total net amount 
 



 
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
 




10.	Credit Note Application 
 
Interface Name 	Credit Note Application 
Description 	Credit Note Application 
Interface Code 	T110 
Request Encrypted 	Y 	
Response Encrypted 	Y 	
Request Message 	{ 

 
 	"oriInvoiceId": "0123456", 
"oriInvoiceNo": "1234556789", 
"reasonCode": "102", 
"reason": "refundreason", 
"applicationTime": "2019-06-15 15:02:02", 
"invoiceApplyCategoryCode": "1", 
"currency": "UGX", 
"contactName": "1", 
"contactMobileNum": "1", 
"contactEmail": "1", 
"source": "101", 
"remarks": "Remarks", 
"sellersReferenceNo": "00000000012", 
"goodsDetails": [{ 
 	"item": "apple", 
 	"itemCode": "101", 
 	"qty": "2", 
 	"unitOfMeasure": "kg", 
 	"unitPrice": "150.00", 
 	"total": "1", 
 	"taxRate": "0.18", 
 	"tax": "22.18", 
 	"orderNumber": "1", 
 	"deemedFlag": "1", 
 	"exciseFlag": "2", 
 	"categoryId": "1123", 
 	"categoryName": "Test", 
 	"goodsCategoryId": "1125", 
 	"goodsCategoryName": "Test", 
 	"exciseRate": "0.12", 
 
}, { 
 
 
 
 	"exciseRule": "1", 
"exciseTax": "20.22", 
"pack": "1", 
"stick": "20", 
"exciseUnit": "101", 
"exciseCurrency": "UGX", 
"exciseRateName": "123", 
"vatApplicableFlag": "1" 
"item": "car", 
"itemCode": "101", 
"qty": "2", 
"unitOfMeasure": "kg", 
"unitPrice": "150.00", 
"total": "1", 
"taxRate": "0.18", 
"tax": "22.18", 
"orderNumber": "2", 
"deemedFlag": "1", 
"exciseFlag": "2", 
"categoryId": "1123", 
"categoryName": "Test", 
"goodsCategoryId": "1125", 
"goodsCategoryName": "Test", 
"exciseRate": "0.12", 
"exciseRule": "1", 
"exciseTax": "20.22", 
"pack": "1", 
"stick": "20", 
"exciseUnit": "101", 
"exciseCurrency": "UGX", 
"exciseRateName": "123", 
"vatApplicableFlag": "1" 
	 
 
 	}], 
"taxDetails": [{ 
 "taxCategoryCode": "01", 
	 	"netAmount": "-3813.55", 
	 	"taxRate": "0.18", 
	 	"taxAmount": "-686.45", 
	 	"grossAmount": "-4500.00", 

		 	 	"exciseUnit": "101", 
	 	 	"exciseCurrency": "UGX", 
	 	 	"taxRateName": "123" 
	 	}, { 
	 	 "taxCategoryCode": "05", 
	 	 	"netAmount": "-1818.18", 
	 	 	"taxRate": "0.1", 
	 	 	"taxAmount": "-181.82", 
	 	 	"grossAmount ": "-2000.00", 
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
 "importServicesSeller": { 
  "importBusinessName": "lisi", 
  "importEmailAddress": "123456@163.com", 
  "importContactNumber": "15501234567", 
  "importAddress": "beijin", 
  "importInvoiceDate": "2020-09-05",   "importAttachmentName": "test",   "importAttachmentContent": 
"MIIDFjCCAf6gAwIBAgIRAKPGAol9CEdpkIoFa8huM6zfj1WEBRxteoo6PH46un4FGj 4N6ioIGzVr9G40uhQGdm16ZU+q44XjW2oUnI9w=" 
 }, 
"basicInformation": { 
  "operator": "aisino", 
  "invoiceKind": "1", 
  "invoiceIndustryCode": "102", 
  "branchId": "207300908813650312" 
 }, 
 "attachmentList": [{ 
  "fileName": "101", 
  "fileType": "png",   "fileContent": 
"MIIDFjCCAf6gAwIBAgIRAKPGAol9CEdpkIoFa8huM6zfj1WEBRxteoo6PH46un4FGj 4N6ioIGzVr9G40uhQGdm16ZU+q44XjW2oUnI9w=" 
 }] 
} 
Response Message 	{ 
 	"referenceNo": "1234556789" 
} 
Flow Description 	1.	Original invoice billing time + credit Note Maximum InvoicingDays (type code corresponding to the dictionary table) 
2.	Current system time Cannot submit creditNode application 
Field description 
 
Field 	Field Name 	Required 	Length 	Description 

oriInvoiceId 	originalInvoice ID 	N 	32 	If the original invoice ID&Number is empty, that means you will request a credit note without original FDN, otherwise they must be exist and matched, and not been referred to debit note and credit note. 
Can be obtained from T109 
response or T108 response 
oriInvoiceNo 	originalInvoice number 	N 	20 	
reasonCode 	refundreasoncode 	Y 	3 	Corresponding dictionaryrefundReason 
The values are as follows: 101:Return of products due to expiry or damage, etc. 102:Cancellation of the purchase. 
103:Invoice amount wrongly stated due to miscalculation of price, tax, or discounts, etc. 104:Partial or complete waive off of the product sale after the invoice is generated and sent to customer. 
105:Others (Please specify) 
reason 	refundreason 	N 	1024 	Required if ‘reasonCode’ is ‘105’ 
applicationTime 	refundSubmission time 	Y 	Date 	yyyy-MM-dd HH24:mi:ss 
invoiceApplyCa tegoryCode 	invoice apply 
category code from dictionary 	Y 	3 	invoice apply category code from dictionary 
101:creditNote 
currency 	currency 	Y 	10 	Must be the same as the original invoice ‘currency’ 
contactName 	contact Name 	N 	200 	 
contactMobile Num 	contact mobile number 	N 	30 	 
contactEmail 	Contact email 	N 	50 	Mailbox format 
source 	application source 	Y 	3 	101:EFD 
102:Windows Client APP 
103:WebService API 
104:Mis 
				105:Webportal 
106:Offline Mode Enabler  
107:USSD 
108:ASK URA 
 
remarks 	Remarks 	N 	500 	 
sellersReferenc eNo 	Sellers 
ReferenceNo 	N 	50 	 
 
Goods DetailsInternal field: 
Field 	Field Name 	Required 	Length 	Description 
item 	item name 	Y 	200 	Same as the original invoice 
itemCode 	item code 	Y 	 50 	Same as the original invoice 
qty 	Quantity 	Y 	Number(
20,8) 	Must be negative, the absolute value cannot be greater than the number of commodity rows 
corresponding to the positive invoice; 
Integer digits cannot exceed 12, decimal digits cannot exceed 8; 
unitOfMeasure 	unit of measure 	Y 	3 	from T115 rateUnit -->value 
Required if discountFlag is 1 or 2 
unitPrice 	unit Price 	Y 	Number(
20,8) 	Must be positive and same as the original invoice 
total 	total price 	Y 	Number(
20,8) 	Must be negative, the absolute value cannot be greater than the amount of the product 
corresponding to the positive invoice; 
Integer digits cannot exceed 12, decimal digits cannot exceed 4; 
taxRate 	tax rate 	Y 	Number(
20,8) 	Same as original invoice 
tax 	tax 	Y 	Number(
20,8) 	Must be negative, the absolute value cannot be greater than the amount of the product 
corresponding to the positive invoice; 
Integer digits cannot exceed 12, decimal digits cannot exceed 4; 
orderNumber 	order number 	Y 	number 	Same as original invoice 
deemedFlag 	whetherdeemed 	Y 	1 	1 : deemed   
2: not deemed 
Same as original invoice 
exciseFlag 	whetherexcise 	Y 	1 	1 : excise   
2: not excise 
Same as original invoice 
categoryId 	exciseDutyCode 	N 	18 	Same as original invoice 
categoryName 	Excise tax category 
name 	N 	1024 	Same as original invoice 
goodsCategory
Id 	goods Category id 	Y 	18 	Same as original invoice 
goodsCategory Name 	goods Category Name 	N 	200 	Same as original invoice 
exciseRate 	Excise tax rate 	N 	21 	Same as original invoice 
exciseRule 	Excise Calculation Rules 	N 	1 	1: Calculated by tax rate  
2 Calculated by Quantity 
Same as original invoice 
exciseTax 	Excise tax 	N 	number 	Must be negative 
pack 	pack 	N 	number 	Same as original invoice 
stick 	stick 	N 	number 	Same as original invoice 
exciseUnit 	exciseUnit 	N 	3 	Same as original invoice 
exciseCurrency 	exciseCurrency 	N 	10 	Same as original invoice 
exciseRateNam
e 	exciseRateName 	N 	100 	If exciseRule is 1, the value is 
(exciseRate * 100) plus the character '%', for example 
exciseRate is 0.18, this value is 18% 
If exciseRule is 2, this value is exciseCurrency + exciseRate + 
space + exciseUnit, for example: UGX650 per litre 
Same as original invoice 
vatApplicable Flag 	vatApplicableFla g 	N 	1 	It is not required.  
The default value is 1. 0 when using for VAT out of scope 
 
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
11:F: VAT Not Applicable 
netAmount  	net amount 	Y 	number 	Must be negative or 0; 
Integer digits cannot exceed 16, decimal digits cannot exceed 4; 
taxRate 	tax rate 	Y 	number 	 18% corresponds to 0.18 
0 corresponds to 0 
Tax-free correspondence ‘-’ in the database” 
Integer digits cannot exceed 1, decimal digits cannot exceed 4; 
taxAmount 	tax 	Y 	number 	Must be negative or 0 
Integer digits cannot exceed 16, decimal digits cannot exceed 4; 
grossAmount 	gross amount 	Y 	number 	Must be negative or 0; 
Integer digits cannot exceed 16, decimal digits cannot exceed 4; 
exciseUnit 	exciseUnit 	N 	3 	When the tax type is Excise Duty and the tax rate is calculated per 
unit, it is required 
exciseCurrency 	exciseCurrency 	N 	10 	When the tax type is Excise Duty and the tax rate is calculated per 
unit, it is required 
taxRateName 	taxRateName 	N 	100 	If 'taxCategoryCode' is empty,'taxRateName' can not be empty!. 
If 'taxCategoryCode' is '05' or '10' , 'taxRateName' can not be empty! 
 
SummaryInternal field: 
Field 	Field Name 	Required 	Length 	Description 
netAmount 	 net amount  	Y 	number 	Tax Receipt total net amount  Must be negative or 0 
				Integer digits cannot exceed 16, decimal digits cannot exceed 4; 
taxAmount  	 tax amount 	Y 	number 	Tax Receipt total tax amount 
Must be negative or 0; 
Integer digits cannot exceed 16, decimal digits cannot exceed 4; 
grossAmount 	 gross amount 	Y 	number 	Tax Receipt total gross amount 
Must be negative ; 
Integer digits cannot exceed 16, decimal digits cannot exceed 4; 
itemCount 	Purchase item lines 	Y 	10 	Purchase item lines 
modeCode 	mode 	Y 	1 	Issuing receipt mode (1:Online or 
0:Offline), this code is from dictionary table 
qrCode 	qrCode 	N 	500 	 
 
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
Integer digits cannot exceed 16 
orderNumber 	orderNumber 	Y 	1 	Sort by lowercase letters, such as a, b, c, d, etc. 
 
Buyer DetailsInternal field: 
Field 	Field Name 	Required 	Length 	Description 
buyerTin 	Buyer TIN 	N 	10-20 	If 'buyerType' is '0', buyerTin cannot be empty! 
buyerNinBRn 	Buyer NIN 	N 	100 	 
buyerPassport	Passport number 	N 	20 	 
Num 				
buyerLegalNam e 	legal name 	N 	256 	 
buyerBusiness Name 	business name 	N 	 256 	 
buyerAddress 	buyeraddress 	N 	500 	 
buyerEmail 	buyeremail 	N 	50 	Mailbox format 
buyerMobilePh one 	mobile phone 	N 	30 	 
buyerLinePhon e 	line phone 	N 	30 	 
buyerPlaceOfB usi 	place of business 	N 	500 	 
buyerType 	Buyer Type 	Y 	1 	0	: B2B  
1	: B2C 
2	: Foreigner 
3	: B2G 
buyerCitizens hip 	Buyer Citizenship 	N 	128 	 
buyerSector 	Buyer Sector 	N 	200 	 
buyerReferenc eNo 	Buyer ReferenceNo 	N 	50 	EFD and CS do not need to be transmitted, and the external interface is used. 
 
ImportServicesSeller field: 
Field 	Field Name 	Required 	Length 	Description 
importBusines sName 	Import BusinessName 	N 	500 	invoiceIndustryCode is equal 
to 104, importbusinessname cannot be empty 
importEmailAd dress 	Import EmailAddress 	N 	50 	The byte length cannot be less than 6 and cannot be greater than 50 
importContact
Number 	Import ContactNumber 	N 	30 	 
importAddress 	Import Address 	N 	500 	invoiceIndustryCode is equal to 104, importAddress cannot 
be empty 
importInvoice Date 	importInvoiceDat e 	Y 	date 	yyyy-MM-dd 
importAttachm entName 	importAttachment
Name 	 N 	256 	importAttachmentName eg: test.png 
				Attachment format: png、doc、 pdf、jpg、txt、docx、xlsx、 cer、crt、der 
importAttachm entContent 	importAttachment
Content 	N 	Unlimit ed 	 
 
Basic InformationInternal field:   
Field 	Field Name 	Required 	Length 	Description 
operator 	Operator 	Y 	150 	 
invoiceKind 	invoice kind 	Y 	1 	1 :invoice 2: receipt 
invoiceIndust ryCode 	invoiceIndustryC ode 	N 	3 	101:General Industry 
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
branchId 	branchId 	N 	18 	 
currencyRate 	currencyRate 	N 	Number 	 
 
AttachmentList field: 
Field 	Field Name 	Required 	Length 	Description 
fileName 	fileName 	N 	256 	 
fileType 	fileType 	N 	5 	fileType format: png、doc、 pdf、jpg、txt、docx、xlsx、 cer、crt、der 
fileContent 	fileContent 	N 	Unlimit ed 	Base64 content 
 



11.	Credit /Cancel Debit Note Application List Query 
Interface Name 	Credit/Cancel Debit Note Application List Query 
Description 	Credit/Cancel Debit Note Application List Query 
Interface Code 	T111 
Request Encrypted 	Y 

Response Encrypted 	Y 	
Request Message 	{ 
 

} 	"referenceNo": "1234556789", 
"oriInvoiceNo": "1234556789", 
"invoiceNo": "1234556789", 
"combineKeywords": "11111", 
"approveStatus": "101", 
"queryType": "1", 
"invoiceApplyCategoryCode": "1", 
"startDate": "2019-06-14", 
"endDate": "2019-06-15", "pageNo": "1", 
"pageSize": "10" , 
"creditNoteType": "1", 
"branchName": "Mr. HENRY KAMUGISHA", 
"sellerTinOrNin": "1009837013", 
"sellerLegalOrBusinessName": "CLASSY TRENDS BOUTIQUE" 
Response Message 	{ 
 
 
 
 	"page": { 
	 	"pageNo": "1", 
	 	"pageSize": "10", 
	 	"totalSize": "Total number of articles", 
	 	"pageCount": "total pages" 
}, 
"records": [{ 
	 	"id": "1234556789", 
	 	"oriInvoiceNo": "1234556789", 
	 	"invoiceNo": "1234556789", 
	 	"referenceNo": "1234556789", 
	 	"approveStatus": "101", 
	 	"applicationTime": "16/06/2019 15:02:02", 
	 	"invoiceApplyCategoryCode": "1", 
	 	"grossAmount": "66.00", 
	 	"oriGrossAmount": "123.00", 
	 	"currency": "1",  	 
	 	"taskId": "1", 	 
	 	"buyerTin": "7777777777", 
	 	"buyerBusinessName": "aisino", 
	 	"buyerLegalName": "test", 
 
}, { 
 
 
 	"tin": "8888888888", 
"businessName": "aisino1", 
"legalName": "test", "waitingDate": "1", 
"dataSource": "101" 
"id": "1234556789", 
"oriInvoiceNo": "1234556789", 
"invoiceNo": "1234556789", 
"referenceNo": "1234556789", 
"approveStatus": "101", 
"applicationTime": "16/06/2019", 
"invoiceApplyCategoryCode": "1", 
"grossAmount": "1", 
"oriGrossAmount": "123.00", 
"currency": "1", 
"taskId": "1", 
"buyerTin": "7777777777", 
"buyerBusinessName": "aisino", 
"buyerLegalName": "test", 
"waitingDate": "1", 
"dataSource": "101" 
	 
} 	}] 	
Flow Description 	1. Search and filter 
1)	Enter the keyword and click go to query, match the two parameters of Reference No. and Invoice/Receipt No., and the search result needs to contain keywords. 
2)	Filtering can be matched by date and approval state Approval State 
Field description 
Field 	Field Name 	Required 	Length 	Description 
referenceNo 	referenceNo 	N 	20 	 
oriInvoiceNo 	originalInvoice number 	N 	20 	 
invoiceNo 	Invoice number 	N 	20 	 
approveStatus 	Approval Status 	N 	3 	101:Approved 

				102:Submitted 
103:Rejected 
104:Voided 
 
Associationdictionary table 
creditNoteApproveStatus 
 
You can send multiple values separated by ‘,’ 
for example, "101,102" 
startDate 	application start date 	N 	Date 	yyyy-MM-dd 
endDate 	application 
enddate 	N 	Date 	yyyy-MM-dd 
pageNo 	current page number 	Y 	10 	 
pageSize 	How many records are displayed per page 	Y 	3 	Cannot be greater than the integer 100 
queryType 	Query type 	Y 	1 	1. Current user's application list 2. Query the negative votes applied by other taxpayers, and the approver is the current user's to-do list. 
3. The current user approval is completed. 
invoiceApplyCa tegoryCode 	invoice apply 
category code from dictionary 	N 	3 	101: credit note   
103: cancellation of debit note You can set multiple values separated by‘,’, for 
example, "101,103" 
creditNoteTyp
e 	creditNoteType 	N 	1 	1:Credit Note 
2:Credit Note Without FDN Not required, default value is 1. 
branchName 	branchName 	N 	500 	agent inquiry 
sellerTinOrNi n 	sellerTinOrNin 	N 	100 	agent inquiry 
sellerLegalOr BusinessName 	sellerLegalOrBus inessName 	N 	256 	agent inquiry 
 
Field 	Field Name 	Required 	Length 	Description 
id 	Application bill Id 	Y 	18 	 
oriInvoiceNo 	originalInvoice number 	Y 	20 	 
invoiceNo 	Invoice number 	Y 	20 	 
referenceNo 	referenceNo 	Y 	20 	 
approveStatus 	Approval Status 	Y 	3 	 
applicationTime 	Refund Submission time 	Y 	Date 	 
invoiceApplyCa tegoryCode 	invoice apply 
category code from dictionary 	Y 	3 	101: credit note  
102: debit note  
103: cancel of debit note  
104: cancel of credit note 
grossAmount 	credit 
applicationtotal price 	Y 	Number 	 
oriGrossAmoun
t 	Invoice total price 	Y 	Number 	 
currency 	currency 	Y 	10 	 
buyerTin 	Buyer TIN 	Y 	10-20 	 
buyerBusinessN ame 	buyerbusiness Name 	Y 	256 	 
buyerLegalNam
e 	buyer Legal Name 	Y 	256 	 
tin 	sellerTIN 	Y 	10-20 	 
businessName 	sellerbusiness 
Name 	  Y 	256 	 
legalName 	sellerlegalName 	Y 	256 	 
waitingDate 	Application waiting time 	Y 	Number 	approveStatus = 102 System Date 
- Application Date approveStatus = 101 Approval 
Date - Application Date approveStatus = 103 Approval 
Date - Application Date 
dataSource 	data source 	Y 	3 	101:EFD 
102:Windows Client APP 
103:WebService API 
104:Mis 
105:Webportal 
106:Offline Mode Enabler 
				107:USSD 
108:ASK URA 
 
taskId 	Tast Id 	Y 	18 	 
pageNo 	current page number 	 	3 	 
pageSize 	How many records are displayed per page 	 	10 	 
totalSize 	Total number of 
articles 	 	10 	 
pageCount 	total pages 	 	10 	 
12.	Credit Note Application Details 
Interface Name 	credit application details 
Description 	credit application details 
Interface Code 	T112 
Request Encrypted 	Y 	
Response Encrypted 	Y 	
Request Message 	{ 
 
} 	"id": "229700709531101368" 
Response Message 	{ 
 
 
 	"id": "229700709531101368", 
"oriInvoiceNo": "27748703589774744343", 
"oriInvoiceId": "27748703589774744343", 
"refundInvoiceNo": "27748703589774744346", 
"referenceNo": "181021206600004292110001", 
"reason": "Buyer refused to accept the invoice incorrect invoice/receipt", 
"selectRefundReasonCode": "101", 
"approveStatusCode": "101", 
"updateTime": "16/06/2019", 
"applicationTime": "16/06/2019", 
"invoiceApplyCategoryCode": "101", 
"contactName": "1", 
"contactMobileNum": "1", 
"contactEmail": "1", 
"source": "102", 

		 	"taskId": "1", 
	 	"remarks": "Remarks", 
"approveRemarks": "approveRemarks", 
	 	"grossAmount": "1", 
	 	"totalAmount": "1", 
	 	"currency": "1", 
	 	"refundIssuedDate": "16/06/2019 15:02:02", 
	 	"issuedDate": "16/06/2019 15:02:02", 
	 	"tin": "7777777777", 
	 	"sellersReferenceNo": "0000000002", 
	 	"nin": "777777777700", 
	 	"legalName": "Struggle Software Development Co., Ltd.", 
	 	"businessName": "lisi", 
	 	"mobilePhone": "15501234567", 
	 	"address": "beijing", 
	 	"emailAddress": "beijing", 
	 	"buyerTin": "7777777777", 
	 	"buyerNin": "777777777700", 
	 	"buyerLegalName": "Struggle Software Development Co., Ltd.", 
	 	"buyerBusinessName": "lisi", 
	 	"buyerAddress": "beijing", 
	 	"buyerEmailAddress": "email@163.com", 
	 	"buyerMobilePhone": "15674448569", 
	 	"buyerLinePhone": "132142324159", 
	 	"buyerCitizenship": "132142324159", 
	 	"buyerPassportNum": "CN1234567890", 
	 	"buyerPlaceOfBusi": "DistrictCountysub-County", 
"importBusinessName": "lisi", 
 "importEmailAddress": "123456@163.com", 
 "importContactNumber": "15501234567", 
 "importAddress": "beijin", 
 "importInvoiceDate": "2020-09-05",  "importAttachmentName": "test",  "importAttachmentContent": 
"MIIDFjCCAf6gAwIBAgIRAKPGAol9CEdpkIoFa8huM6zfj1WEBRxteoo6PH46un4FGj
4N6ioIGzVr9G40uhQGdm16ZU+q44XjW2oUnI9w=", 
 "attachmentList": [{ 
  "fileName": "101", 
  "fileType": "png",   "fileContent": 
"MIIDFjCCAf6gAwIBAgIRAKPGAol9CEdpkIoFa8huM6zfj1WEBRxteoo6PH46un4FGj 4N6ioIGzVr9G40uhQGdm16ZU+q44XjW2oUnI9w=" 
	 }] 
 
} 
Flow Description 	Query details based on the application ID. 
Field description 
	Field 	Field Name 	Required 	Length 	Description 
id 		Application ID 	Y 	20 	 
 
Field 	Field Name 	Required 	Length 	Description 
id 	Application ID 	Y 	20 	 
oriInvoiceNo 	Original Invoice number 	Y 	20 	 
oriReceiptId 	Original Invoice ID 	Y 	32 	 
refundInvoiceN o 	Credit Invoice number 	Y 	20 	 
referenceNo 	Reference No 	Y 	50 	 
 
Reason 	 
Refund reason 	Y 	 
1024 	 
selectRefundRe asonCode 	Refund reason code 	Y 	3 	Corresponding dictionary refund 
Reason 
approveStatusC ode 	Approval Status 	Y 	3 	101	Approved 
102	Pending 
103	Rejected 
Association dictionary table approveStatus 
updateTime 	Processing time 	Y 	Date 	 
applicationTime 	refundSubmission time 	Y 	Date 	 
invoiceApplyCa tegoryCode 	invoice apply 
category code from dictionary 	Y 	3 	 
contactName 	contact Name 	Y 	256 	 
contactMobile Num 	contact mobile number 	Y 	30 	 
contactEmail 	Contact email 	 	 	 
source 	application source 	Y 	3 	101:EFD 
102:Windows Client APP 

				103:WebService API 
104:Mis 
105:Webportal 
106:Offline Mode Enabler 
107:USSD 
108:ASK URA 
 
taskId 	task ID 	Y 	18 	 
remarks 	Remarks 	N 	 	credit application remarks 
approveRemark
s 	approveRemarks 	N 	1024 	approveStatusCode = 101、103 approveRemarks cannot be empty 
grossAmount 	Invoice gross amount 	Y 	 
Number 	 
totalAmount 	creditgross amount 	Y 	Number 	 
currency 	currency 	Y 	10 	 
refundIssuedDa
te 	Credit Issue time 	Y 	Date 	 
issuedDate 	Invoice issue time 	Y 	Date 	 
tin 	Tin 	Y 	10-20 	Seller's Information 
nin 	NIN/BRN 	Y 	100 	Seller's Information 
legalName 	legalName 	Y 	256 	Seller's Information 
businessName 	businessName 	Y 	30 	Seller's Information 
mobilePhone 	Contact Number 	Y 	30 	Seller's Information 
address 	Address 	Y 	500 	Seller's Informationn 
emailAddress 	Email Address 	Y 	50 	Seller's Information 
buyerTin 	buyerTin 	Y 	10-20 	Buyer's Information 
buyerNin 	buyerNin 	Y 	100 	Buyer's Information 
buyerLegalNam
e 	buyerLegalName 	Y 	256 	Buyer's Information 
buyerBusinessN ame 	buyerBusinessNam e 	Y 	256 	Buyer's Information 
buyerAddress 	buyerAddress 	Y 	500 	Buyer's Information 
buyerEmailAdd
ress 	buyerEmailAddress 	Y 	50 	Buyer's Information 
buyerMobilePh one 	buyerMobilePhone 	Y 	30 	Buyer's Information 
buyerLinePhon e 	buyerLinePhone 	Y 	30 	Buyer's Information 
buyerCitizenshi p 	buyerCitizenship 	Y 	128 	Buyer's Information 
buyerPassport	buyerPassportNum 	Y 	20 	Buyer's Information 
Num 				
buyerPlaceOfB
usi 	buyerPlaceOfBusi 	Y 	500 	Buyer's place of business 
sellersReferenc eNo 	sellersReferenceNo 	N 	50 	 
importBusines sName 	Import BusinessName 	N 	500 	invoiceIndustryCode is equal 
to 104, importbusinessname cannot be empty 
importEmailAd dress 	Import EmailAddress 	N 	50 	The byte length cannot be less than 6 and cannot be greater than 50 
importContact
Number 	Import ContactNumber 	N 	30 	 
importAddress 	Import Address 	N 	500 	invoiceIndustryCode is equal to 104, importAddress cannot 
be empty 
importInvoice Date 	importInvoiceDat e 	N 	date 	 
importAttachm entName 	importAttachment
Name 	 N 	256 	importAttachmentName eg: test.png 
Attachment format: png、doc、 pdf、jpg、txt、docx、xlsx、 cer、crt、der 
 
AttachmentList field: 
Field 	Field Name 	Required 	Length 	Description 
fileName 	fileName 	N 	256 	 
fileType 	fileType 	N 	5 	fileType format: png、doc、 pdf、jpg、txt、docx、xlsx、 cer、crt、der 
fileContent 	fileContent 	N 	Unlimit ed 	Base64 content 
 


13.	Credit /Debit Note approval  
Interface Name 	credit application approval 
Description 	credit application approval 
Interface Code 	T113 
Request Encrypted 	Y 
Response Encrypted 	N 
Request Message 	{ 
 	"referenceNo": "1234556789", 
 	"approveStatus": "101", 
 	"taskId": "1", 
 	"remark": "Remarks" 
} 
Response Message 	Null 
Flow Description 	credit application approval 
Field description 
Field 	Field Name 	Required 	Length 	Description 
referenceNo 	referenceNo 	Y 	20 	 
approveStatus 	Approval Status 	Y 	3 	101 Approved 
103 Rejected 
Associated dictionary table creditNoteApproveStatus 
remark 	Remarks 	Y 	1024 	 
taskId 	task ID 	Y 	20 	 




14.	Cancel of credit /debit note Application 
Interface Name 	Cancel Credit Note 、initiate Cancel of Debit Note Application 
Description 	Cancellation of credit and debit notes 
Interface Code 	T114 
Request Encrypted 	Y 
Response Encrypted 	N 
Request Message 	{ 
 	"oriInvoiceId": "31000000000000000001", 
 	"invoiceNo": "786059685752403327", 
 	"reason": "reason", 
 	"reasonCode": "102", 
	 	"invoiceApplyCategoryCode": "103", 
 "attachmentList": [{ 
  "fileName": "101", 
  "fileType": "png",   "fileContent": 
"MIIDFjCCAf6gAwIBAgIRAKPGAol9CEdpkIoFa8huM6zfj1WEBRxteoo6PH46un4FGj 4N6ioIGzVr9G40uhQGdm16ZU+q44XjW2oUnI9w=" 
 }] 
 
} 
Response Message 	Null 
Flow Description 	 103: cancel of debitNote initiates a workflow and submits a Debit Note request 
 104: cancel of credit note does not take the workflow. Modify invoice status 
Field description 
Field 	Field Name 	Required 	Length 	Description 
oriInvoiceId 	originalInvoice ID 	Y 	20 	InvoiceId from the original invoice. 
invoiceNo 	Invoice number 	Y 	20 	FDN of the credit note 
reason 	cancelreason 	N 	1024 	Required if ‘reasonCode’ is ‘103’ 
reasonCode 	refundreasoncode 	Y 	3 	Corresponding dictionaryrefundReason 
The values are as follows: 
101	Buyer refused to accept the invoice due to incorrect invoice/receipt 
102	Not delivered due to incorrect invoice/receipt 
103	Other reasons 
invoiceApplyCa tegoryCode 	invoice apply 
category code from dictionary 	Y 	3 	103:cancel of debitNote; 
104:cancel of Credit Note; 
105:cancel of Credit Memo; 
 
AttachmentList field: 
Field 	Field Name 	Required 	Length 	Description 
fileName 	fileName 	N 	256 	 
fileType 	fileType 	N 	5 	fileType format: png、doc、 pdf、jpg、txt、docx、xlsx、 cer、crt、der 
fileContent 	fileContent 	N 	Unlimit ed 	Base64 content 
 



15.	System Dictionary Update 
Interface Name 	System dictionary update 
Description 	Query system parameters such as VAT, Excise Duty, and Currency 
Interface Code 	T115 
Request Encrypted 	N 
Response Encrypted 	Y 
Request Message 	Null 
Response Message 	{ 
 
 
 	"creditNoteMaximumInvoicingDays": { 
 	"value": "90", 
 	"name": "Credit Node Maximum Invoicing days" 
}, 
"currencyType": [{ 
 	"value": "101", 
 	"name": "UGX" 
}, { 
 	"value": "102", 
 	"name": "USD" 
}], 
"creditNoteValuePercentLimit": { 
 	"value": "0.6", 
 	"name": "credit Note Value Percent Limit" 
}, 
"rateUnit": [{ 
 	"value": "101", 
 	"name": "per stick" 
}, { 
 	"value": "102", 
 	"name": "per litre" 

		 	}], 
	 	"format": { 
	 	 	"dateFormat": "dd/MM/yyyy", 
	 	 	"timeFormat": "dd/MM/yyyy HH:mm:ss" 
	 	}, 
	 	"sector": [{ 
	 	 	"code": "123", 
	 	 	"name": "Cigarettes", 
	 	 	"parentClass": "0", 
	 	 	"requiredFill": "0" 
	 	}, { 
	 	 	"code": "123", 
	 	 	"name": "Cigarettes", 
	 	 	"parentClass": "0", 
	 	 	"requiredFill": "1" 
	 	}], 
"payWay": [{ 
	 	 	"value": "101", 
	 	 	"name": "Credit" 
	 	}, { 
	 	 	"value": "102", 
	 	 	"name": "Cash" 
	 	}], 
"countryCode": [{ 
	 	 	"value": "301", 
	 	 	"name": "Value Added Tax" 
	 	}, { 
	 	 	"value": "302", 
	 	 	"name": "Income Tax" 
	 	}], 
"exportRateUnit": [{   "value": "101", 
  "name": "per stick", 
  "validPeriodFrom": "2021/08/17", 
  "periodTo": "2021/08/31", 
  "status": "101"  }], 
"deliveryTerms":[{   "value": "CFR", 
  "name": "Cost and Freight" 
 }, { 
	  "value": "CIF", 
  "name": "Cost Insurance and Freight" 
 }], 
} 
Flow Description 	At the time of initialization, the dictionary is updated, and later judged according to the version number version. If the version is the same, there is no need to update the data. If it is different, update the local dictionary. 
Field description 
creditNoteMaximumInvoicingDays、creditNoteValuePercentLimit 
Field 	Field Name 	Required 	Length 	Description 
value 	Dictionary value 	Y 	Number 	 
name 	Name 	Y 	200 	 
 countryCode、payWay、rateUnit、currencyType 
Field 	Field Name 	Required 	Length 	Description 
value 	Dictionary value 	Y 	3 	 
name 	Dictionary name 	Y 	200 	 
description 	Dictionary description 	N 	1024 	currencyType description 
 
Shilling : integer singular 
 
Shillings: integer complex 
 
Cent : decimal singular  
Cents : Decimal complex 
 sector 
Field 	Field Name 	Required 	Length 	Description 
code 	Sector number 	Y 	18 	 
name 	Sector name 	Y 	100 	 
parentClass 	Parent id 	Y 	18 	 
requiredFill 	requiredFill 	Y 	1 	1:Y 0:N 
 format 
Field 	Field Name 	Required 	Length 	Description 
dateFormat 	Date Format 	Y 	20 	System date format 
timeFormat 	Time Format 	Y 	20 	System date format 
 exportRateUnit 
Field 	Field Name 	Required 	Length 	Description 
value 	Dictionary value 	Y 	3 	 
name 	Name 	Y 	200 	 
validPeriodFr om 	validPeriodFrom 	Y 	Date 	Follow System date format 
periodTo 	periodTo 	Y 	Date 	Follow System date format 
status 	status 	Y 	3 	101:Enable 
102:Disable 
 
16.	Z-report Daily Upload 
Interface Name 	Z-report Daily Upload 
Description 	Z-report Daily Upload 
Interface Code 	T116 
Request Encrypted 	Y 
Response Encrypted 	Y 
Request Message 	{ 
To be determined 
} 
Response Message 	Null 
Flow Description 	Z-report Daily Upload 
Field description 
Field 	Field Name 	Required 	Length 	Description 
 	 	 	 	 
 


17.	Invoice Checks 
Interface Name 	Invoice Checks 
Description 	Contrast client invoice with server invoice consistent 
Interface Code 	T117 
Request Encrypted 	Y 
Response Encrypted 	Y 
Request Message 	[{ 
 	"invoiceNo": "10239892399", 
 	"invoiceType": "1" 
}, { 
 
 	"invoiceNo": "10239892398", 
 	"invoiceType": "2" 
}] 
Response Message 	[{ 
 	"invoiceNo": "10239892399", 
 	"invoiceType": "1" 
}, { 
 	"invoiceNo": "10239892398", 
 	"invoiceType": "2" 
}] 
Flow Description 	1.	The client uploads a segment of invoiceNo and invoice category 
2.	Query the database in the background and compare the invoice type and invoiceNo of the invoice. 
3.	Compare the inconsistent invoice number or return the invoice number without results to the client. 
4.	If the comparison is consistent, return empty 
5.	Query sellerTin equals (outer packet gets Tin) 
6.	Query deviceNo equal to the deviceNo of the outer packet. 
Field description 
Field 	Field Name 	Required 	Length 	Description 
invoiceNo 	invoiceNo 	Y 	20 	 
invoiceType 	invoice type 	Y 	1 	1:Invoice/Receipt 
2:Credit Note With Original 
FDN 
5:Credit Note Without 
Original FDN 
4:Debit Note 
The size of the collection cannot exceed the set value 	





18.	Query Credit Note Application and Cancel of Debit Note Application Details 
Interface Name 	Query Credit Note Application and Cancel of Debit Note Application Details 
Description 	Query Credit Note and Cancel Debit Note to apply for details 
Interface Code 	T118 
Request Encrypted 	Y 	
Response Encrypted 	Y 	
Request Message 	{ 
 
} 	"id": "229700709531101368" 
Response Message 	{ 

 
 	"goodsDetails": [{ 
 	"itemName": "apple", 
 	"itemCode": "101", 
 	"qty": "2", 
 	"unit": "kg", 
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
 	"categoryId": "1123", 
 	"categoryName": "Test", 
 	"goodsCategoryId": "1125", 
 	"goodsCategoryName": "Test", 
 	"exciseRate": "0.12", 
 	"exciseRule": "1", 
 	"exciseTax": "20.22", 
 	"pack": "1", 
 	"stick": "20", 
 	"exciseUnit": "101", 
 	"exciseCurrency": "UGX", 
 	"exciseRateName": "123", 

}, { 
 
 
 	"vatApplicableFlag": "1" 
"itemName": "car", "itemCode": "101", 
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
"categoryId": "1123", 
"categoryName": "Test", 
"goodsCategoryId": "1125", 
"goodsCategoryName": "Test", 
"exciseRate": "0.12", 
"exciseRule": "1", 
"exciseTax": "20.22", 
"pack": "1", 
"stick": "20", 
"exciseUnit": "101", 
"exciseCurrency": "UGX", 
"exciseRateName": "123", 
"vatApplicableFlag": "1" 
	 
 
 	}], 
"taxDetails": [{ 
 "taxCategoryCode": "01", 
	 	"netAmount": "3813.55", 
	 	"taxRate": "0.18", 
	 	"taxAmount": "686.45", 
	 	"grossAmount": "4500.00", 
	 	"exciseUnit": "101", 
	 	"exciseCurrency": "UGX", 
	 	"taxRateName": "123" 
}, { 
 "taxCategoryCode": "05", 
	 
 
 
} 	 	"netAmount": "1818.18", 
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
 	"previousNetAmount": "8379", 
 	"previousTaxAmount": "868", 
 	"previousGrossAmount": "9247" 
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
"basicInformation": { 
 	"invoiceType": "2", 
 	"invoiceKind": "1", 
 	"invoiceIndustryCode": "102" 
}, 
Flow Description 	Query credit application product information tax information 
Field description 
Field 	Field Name 	Required 	Length 	Description 
id 	Application ID 	Y 	20 	 
 
Goods DetailsInternal field: 
Field 	Field Name 	Required 	Length 	Description 
item 	item name 	Y 	200 	 
itemCode 	item code 	Y 	50 	 
qty 	Quantity 	Y 	Number(
20,8) 	 
unit 	unit of measure 	Y 	20 	from T115 rateUnit -->value 
unitPrice 	unit Price 	Y 	Number(
20,8) 	 
total 	total price 	Y 	Number(
20,8) 	 
taxRate 	tax rate 	Y 	Number(
20,8) 	Save decimals, such as 18% deposit 
0.18 
tax 	tax 	Y 	Number 	 
discountTotal 	discount total 	Y 	Number 	 
discountTaxRat e 	discount tax rate 	Y 	Number 	Save decimals, such as 18% deposit 
0.18 
orderNumber 	order number 	Y 	Number 	 
discountFlag 	Whether the product line is discounted 	Y 	1 	1: discount 2: non-discount 
deemedFlag 	whetherdeemed 	Y 	1 	1 : deemed  2: not deemed 
exciseFlag 	whetherexcise 	Y 	1 	1 : excise  2: not excise 
categoryName 	Excise tax category 
name 	Y 	1024 	 
goodsCategory Name 	goods Category Name 	Y 	200 	 
exciseRate 	Excise tax rate 	Y 	21 	 
exciseRule 	Excise Calculation Rules 	Y 	1 	1: Calculated by tax rate 2 Calculated by Quantity 
exciseTax 	Excise tax 	Y 	 	 
pack 	pack 	Y 	Number 	 
stick 	stick 	Y 	Number 	 
exciseUnit 	exciseUnit 	Y 	3 	 
exciseCurrency 	exciseCurrency 	Y 	10 	 
exciseRateNam
e 	exciseRateName 	Y 	500 	 
vatApplicable Flag 	vatApplicableFla g 	N 	1 	It is not required.  
The default value is 1. 
0 when using VAT out of scope 
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
11: VAT Out of Scope 
netAmount  	net amount 	Y 	Number 	 
taxRate 	tax rate 	Y 	Number 	Save decimals, such as 18% deposit 
0.18 
taxAmount 	tax 	Y 	Number 	 
grossAmount 	gross amount 	Y 	Number 	 
exciseUnit 	exciseUnit 	Y 	3 	 
exciseCurrency 	exciseCurrency 	Y 	10 	 
taxRateName 	taxRateName 	N 	100 	 
 
SummaryInternal field: 
Field 	Field Name 	Required 	Length 	Description 
netAmount 	 net amount  	Y 	Number 	Apply credit node 
taxAmount  	 tax amount 	Y 	Number 	Apply credit node 
grossAmount 	 gross amount 	Y 	Number 	Apply credit node 
previousNetAm ount 	previousNetAmou nt 	Y 	Number 	original invoice 
previousTaxAm ount 	previousTaxAmoun t 	Y 	Number 	original invoice 
previousGrossA mount 	previousGrossAmo unt 	Y 	Number 	original invoice 
 
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
Integer digits cannot exceed 16 
orderNumber 	orderNumber 	Y 	1 	Sort by lowercase letters, such as a, b, c, d, etc. 
 
BasicInformation field: 
Field 	Field Name 	Required 	Length 	Description 
invoiceKind 	invoiceKind 	Y 	1 	1 :invoice 2: receipt  
invoiceType 	invoiceType 	Y 	3 	2:Credit Note 
4:Debit Note 
invoiceIndustry Code 	invoiceIndustryCod e 	Y 	3 	101:General Industry 
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




 
19.	Query Taxpayer Information By TIN 
Interface Name 	Query Taxpayer Information By TIN or ninBrn 
Description 	Query Taxpayer Information By TIN or ninBrn 
Interface Code 	T119 
Request Encrypted 	Y 
Response Encrypted 	Y 
Request Message 	{ 
 	"tin": "7777777777", 
 	"ninBrn": "7777777777" 
} 
Response Message 	{ 
 
 
 	"taxpayer": { 
"tin": "123456", 
"ninBrn": "2222", 
"legalName": "admin", 
"businessName": "1", 
"contactNumber": "18888888888", "contactEmail": "123@qq.com", 
"address": "beijing", 
"taxpayerType": "201", 
"governmentTIN": "1" 
	 
} 	} 	
Flow Description 	Query Taxpayer Information By TIN or ninBrn buyer information 
Field description 
Field 	Field Name 	Required 	Length 	Description 
tin 	 	TIN 	Y 	20 	 
ninBrn 	NIN/BRN 	N 	100 	 
 
Goods DetailsInternal field: 
Field 	Field Name 	Required 	Length 	Description 
tin 	TIN 	Y 	20 	 
ninBrn 	ninBrn 	Y 	100 	 
legalName 	legalName 	Y 	256 	 
businessName 	businessName 	Y 	256 	 
contactNumber 	contactNumber 	Y 	50 	 
contactEmail 	contactemail 	Y 	50 	 
address 	address 	Y 	500 	 
taxpayerType 	taxpayerType 	Y 	3 	201:Individual 202:Non-
Individual 
governmentTIN 	governmentTIN 	Y 	1 	1:YES 
0:NO 
20.	Void Credit Debit/Note Application 
Interface Name 	Void Credit Debit/Note Application 
Description 	Void Credit Debit/Note Application 
Interface Code 	T120 
Request Encrypted 	Y 
Response Encrypted 	N 
Request Message 	{ 
 	"businessKey": "12345678901", 
 	"referenceNo": "23121212134" 
} 
Response Message 	null 
Flow Description 	Void Credit Debit/Note Application 
Field description 
Field 	Field Name 	Required 	Length 	Description 
businessKey  	businessKey 	Y 	20 	businessKey from T111 id 
referenceNo
 	 	referenceNo 	Y 	20 	referenceNo from T111 referenceNo 
 
21.	Acquiring exchange rate 
Interface Name 	Acquiring exchange rate 
Description 	Acquiring exchange rate 
Interface Code 	T121 
Request Encrypted 	Y 
Response Encrypted 	Y 
Request Message 	{ 
 	"currency": "USD", 
"issueDate": "2020-05-16" 
 
} 
Response Message 	{ 
 
 
 
} 	"currency": "USD", 
"rate": "3700", 
"importDutyLevy": "3740.6388", 
"inComeTax": "3740.6388", 
"exportLevy": "3730.6444" 
Flow Description 	Acquiring exchange rate 
Field description 
Field 	Field Name 	Required 	Length 	Description 
currency 	 	currency 	Y 	3 	 
issueDate 	issueDate 	N 	Date 	issueDate format must be yyyyy-MM-dd! 
 
Field 	Field Name 	Required 	Length 	Description 
currency 	 	currency 	Y 	3 	 
rate 	 	VAT rate 	Y 	Number 	Exchange rate of target currency to ugx eg: 1usd = 3700ugx 
importDutyLev y 	importDutyLevy 	Y 	Number 	 
inComeTax 	inComeTax 	Y 	Number 	 
exportLevy 	exportLevy 	Y 	Number 	 




22.	Query cancel credit note details 
Interface Name 	Query cancel credit note details 
Description 	Query cancel credit note details Mapping to T114 
Interface Code 	T122 
Request Encrypted 	Y 
Response Encrypted 	Y 
Request Message 	{ 
 	"invoiceNo": "22970000531455" 
} 
Response Message 	{ 
 
 
 
} 	"invoiceNo": "22970000531455", 
"currency": "UGX", 
"issueDate": "08/05/2019 17:13:12", 
"grossAmount": "3700.00", 
"reasonCode": "101", 	 
"reason": "", 
Flow Description 	Query cancel credit note details 
Field description 
Field 	Field Name 	Required 	Length 	Description 
invoiceNo  	invoiceNo 	Y 	20 	 
 
Field 	Field Name 	Required 	Length 	Description 
invoiceNo  	invoiceNo 	Y 	20 	 
currency 	currency 	Y 	10 	 
issueDate 	 	issueDate 	Y 	Date 	 
grossAmount 	grossAmount 	Y 	Number 	 
reason 	Cancel reason 	Y 	1024 	 
reasonCode 	Refund reason code 	Y 	3 	Corresponding dictionary cancelRefundReason 
 


23.	Query Commodity Category 
Interface Name 	Query Commodity Category 
Description 	Query Commodity Category 
Interface Code 	T123 	
Request Encrypted 	N 	
Response Encrypted 	N 	
Request Message 	Null 	
Response Message 	 	[{  	 
 	 
 	 
 	 	"commodityCategoryCode": "100000000", 
"parentCode": "0", 
"commodityCategoryName": "Standard", 
"commodityCategoryLevel": "1", 
	 
 
 
}, { 
 
 
 
}] 	"rate": "0.18", 
"isLeafNode": "101", 
"serviceMark": "101", 
"isZeroRate": "101", 
"zeroRateStartDate": "01/12/2019", 
"zeroRateEndDate": "05/12/2019", 
"isExempt": "101", 
"exemptRateStartDate": "06/12/2019", 
"exemptRateEndDate": "10/12/2019", 
"enableStatusCode": "1", "exclusion": "1" 
"commodityCategoryCode": "100000000", 
"parentCode": "0", 
"commodityCategoryName": "Standard", 
"commodityCategoryLevel": "1", 
"rate": "0.18", 
"isLeafNode": "101", 
"serviceMark": "101", 
"isZeroRate": "101", 
"zeroRateStartDate": "01/12/2019", 
"zeroRateEndDate": "05/12/2019", 
"isExempt": "101", 
"exemptRateStartDate": "06/12/2019", 
"exemptRateEndDate": "10/12/2019", 
"enableStatusCode": "1", 
"exclusion": "1" 
Flow Description 	Query Commodity Category 
Field description 
Field 	Field Name 	Require d 	Length 	Description 
commodityCate goryCode 	commodityCategory Code 	Y 	 	 
parentCode  	parentCode 	Y 	 	 
commodityCate goryName 	commodityCategory Name 	Y 	 	 
commodityCate	commodityCategory	Y 	 	 
goryLevel 	Level 			
rate 	rate 	Y 	 	 Correspond tax ratecodeTAX_RATE_CODE  
taxRate 
0.18 18% 
isLeafNode 	isLeafNode 	Y 	 	101:Y   102:N 
serviceMark 	serviceMark 	Y 	 	101:Y   102:N 
isZeroRate 	isZeroRate 	Y 	 	101:Y   102:N 
zeroRateStartD ate 	zeroRateStartDate 	N 	 	 
zeroRateEndDa
te 	zeroRateEndDate 	N 	 	 
isExempt 	isExempt 	Y 	 	101:Y   102:N 
exemptRateStar tDate 	exemptRateStartDat e 	N 	 	 
exemptRateEnd Date 	exemptRateEndDate 	N 	 	 
enableStatusCo de 	enableStatusCode 	Y 	 	1:enable:  0:disable 
exclusion 	exclusion 	Y 	 	0:Zero 
1:Exempt 
2:No exclusion 
24.	Query Commodity Category Pagination 
Interface Name 	Query Commodity Category pagination 
Description 	Query Commodity Category pagination 
Interface Code 	T124 
Request Encrypted 	N 
Response Encrypted 	N 
Request Message 	{ 
 	"pageNo": "1", 
 	"pageSize": "10" 
} 

Response Message 	{ 
 
 
 	"page": { 
	 	"pageNo": "1", 
	 	"pageSize": "10", 
	 	"totalSize": " Total number of articles ", 
	 	"pageCount": "total pages" 
}, 
"records": [{ 
	 	"commodityCategoryCode": "100000000", 
	 	"parentCode": "0", 
	 	"commodityCategoryName": "Standard", 
	 	"commodityCategoryLevel": "1", 
	 	"rate": "0.18", 
	 	"isLeafNode": "101", 
	 	"serviceMark": "101", 
	 	"isZeroRate": "101", 
	 	"zeroRateStartDate": "01/12/2019", 
	 	"zeroRateEndDate": "05/12/2019", 
	 	"isExempt": "101", 
	 	"exemptRateStartDate": "06/12/2019", 
	 	"exemptRateEndDate": "10/12/2019", 
	 	"enableStatusCode": "1", 
	 	"exclusion": "1" 
 "excisable": "101", 
 "vatOutScopeCode": "102" 
}, { 
	 	"commodityCategoryCode": "100000000", 
	 	"parentCode": "0", 
	 	"commodityCategoryName": "Standard", 
	 	"commodityCategoryLevel": "1", 
	 	"rate": "0.18", 
	 	"isLeafNode": "101", 
	 	"serviceMark": "101", 
	 	"isZeroRate": "101", 
	 	"zeroRateStartDate": "01/12/2019", 
	 	"zeroRateEndDate": "05/12/2019", 
	 	"isExempt": "101", 
	 	"exemptRateStartDate": "06/12/2019", 
	 	"exemptRateEndDate": "10/12/2019", 
	 	"enableStatusCode": "1", 
	 	"exclusion": "1" 
 "excisable": "101", 
	  "vatOutScopeCode": "102" 
 	}] 
} 
Flow Description 	Query Commodity Category pagination 
Field description 
Field 	Field Name 	Required 	Length 	Description 
pageNo 	current page number 	Y 	10 	 
pageSize 	How many records are displayed per page 	Y 	3 	Cannot be greater than the integer 100 
 
Field 	Field Name 	Required 	Length 	Description 
commodityCate goryCode 	commodityCategor yCode 	Y 	18 	 
parentCode  	parentCode 	Y 	18 	 
commodityCate goryName 	commodityCategor yName 	Y 	200 	 
commodityCate goryLevel 	commodityCategor yLevel 	Y 	1 	 
rate 	rate 	Y 	4 	 Correspond tax ratecodeTAX_RATE_CODE  
taxRate 
0.18 18% 
isLeafNode 	isLeafNode 	Y 	1 	101:Y  102:N 
serviceMark 	serviceMark 	Y 	1 	101:Y  102:N 
isZeroRate 	isZeroRate 	Y 	1 	101:Y  102:N 
zeroRateStartD ate 	zeroRateStartDate 	N 	Date 	 
zeroRateEndDa
te 	zeroRateEndDate 	N 	Date 	 
isExempt 	isExempt 	Y 	1 	101:Y  102:N 
exemptRateStar tDate 	exemptRateStartDa te 	N 	Date 	 
exemptRateEnd Date 	exemptRateEndDat e 	N 	Date 	 
enableStatusCo	enableStatusCode 	Y 	1 	1:enable: 0:disable 
de 				
exclusion 	exclusion 	Y 	1 	0:Zero 
1:Exempt 
2:No exclusion 
3:Both 0% & '-' 
excisable 	excisable 	Y 	3 	101:Y 
102:N 
pageNo 	current page number 	Y 	3 	 
pageSize 	How many records are displayed per page 	Y 	10 	 
totalSize 	Total number of articles 	Y 	10 	 
pageCount 	total pages 	Y 	10 	 
vatOutScopeCo de 	VAT Out of Scope 	Y 	3 	101:Yes 
102:No 
 



25.	Query Excise Duty 
Interface Name 	Query Excise Duty 
Description 	Query Excise Duty 
Interface Code 	T125 
Request Encrypted 	N 	 
Response Encrypted 	N 
Request Message 	Null 
Response Message 	{ 
 	"exciseDutyList": [{ 
 	 	"id": "000023", 
 	 	"exciseDutyCode": "LED060000", 
 	 	"goodService": "Soft cup", 
 	 	"parentCode": "LED000000", 
 	 	"rateText": "18.00%,shs.100.00 Per minute", 
 	 	"isLeafNode": "0", 
 	 	"effectiveDate": "29/08/2019", 
 	 	"exciseDutyDetailsList": [{ 
 	 	 	"exciseDutyId": "000023", 
 	 	 	"type": "101", 
	 
 
}, { 
 
 
 	 	"rate": "0.18", 
 	"unit": "", 
 	"currency": "101" 
}, { 
 	"exciseDutyId": "000023", 
 	"type": "102", 
 	"rate": "100", 
 	"unit": "101", 
 	"currency": "101" 
}] 
"id": "000023", 
"exciseDutyCode": "LED060000", 
"goodService": "Soft cup", 
"parentCode": "LED000000", 
"rateText": "18.00%,shs.100.00 Per minute", 
"isLeafNode": "0", 
"effectiveDate": "29/08/2019", 
"exciseDutyDetailsList": [{ 
 	"exciseDutyId": "000024", 
 	"type": "101",  	"rate": "0.18", 
 	"unit": "" 
}, { 
 	"exciseDutyId": "000024", 
 	"type": "102", 
 	"rate": "100", 
 	"unit": "101" 
}] 
	 
} 	}] 	

Flow Description 	Query Excise Duty 
Field description 
Field 	Field Name 	Required 	Length 	Description 
id 	id 	Y 	20 	 
exciseDutyCod e 	exciseDutyCode 	Y 	20 	 
goodService 	goodService 	Y 	500 	 
parentCode 	Good parentCode 	Y 	20 	 
rateText 	tax rateText 	Y 	50 	 
exciseDutyId 	Good category ID 	Y 	18 	Corresponding dictionaryrateType 
isLeafNode 	isLeafNode 	Y 	1 	1:Y   0:N 
effectiveDate 	effectiveDate 	Y 	Date 	 
exciseDutyId 	exciseDutyId 	Y 	20 	 
type 	tax rate Calculate type 	Y 	10 	101	Percentage 
102	Unit of measurement 
rate 	tax rate 	Y 	number 	 
unit 	unit of 
measurement 	N 	3 	be empty if type=101,  
can not empty if type=102,  
Corresponding dictionarycode   rateUnit  
 
26.	Get All Exchange Rates 
Interface Name 	get all exchange rates 
Description 	get all exchange rates 
Interface Code 	T126 
Request Encrypted 	Y 	
Response Encrypted 	Y 	
Request Message 	{ 
 
} 	"issueDate": "2020-05-16" 
Response Message 	[ 
 
 
] 	{ 
 	"currency": "USD", 
 	"rate": "3700", 
   "importDutyLevy": "3740.6388", 
   "inComeTax": "3740.6388", 
   "exportLevy": "3730.6444" 
} 
Flow Description 	Acquiring exchange rate 
Field description 
Field 	Field Name 	Required 	Length 	Description 
issueDate 	issueDate 	N 	Date 	issueDate format must be yyyyy-MM-dd! 
 
Field 	Field Name 	Required 	Length 	Description 
currency 	 	currency 	Y 	3 	 
rate 	 	VAT rate 	Y 	Number 	Exchange rate of target currency to ugx eg: 1usd = 3700ugx 
importDutyLev y 	importDutyLevy 	Y 	Number 	 
inComeTax 	inComeTax 	Y 	Number 	 
exportLevy 	exportLevy 	Y 	Number 	 
 


27.	Goods/Services Inquiry 
Interface Name 	Goods/Services Inquiry 
Description 	Goods/Services Inquiry 
Interface Code 	T127 
Request Encrypted 	Y 	
Response Encrypted 	Y 	
Request Message 	{ 
 
 
 	"goodsCode": "0001", 
"goodsName ": "cat", 
"commodityCategoryName": "cat", 
"pageNo": "10", 
"pageSize": "10", 
"branchId": "206637528324276772", 
"serviceMark": "101", 
"haveExciseTax": "101", 
"startDate": "2021-09-10", 
"endDate": "2021-09-11", 
"combineKeywords": "425502528294126235", 
"goodsTypeCode": "101", 
"tin": "1009837013", 
"queryType": "1" 

	} 	
Response Message 	{ 
 
 
 
 	"page": { 
 "pageNo": "1", 
 "pageSize": "10", 
 "totalSize": " Total number of articles ", 
 "pageCount": "total pages" 
}, 
"records": [{ 
 "id": "000023", 
 "goodsName": "cat", 
 "goodsCode": "0001", 
 "measureUnit": "101", 
 "unitPrice": "13.99", 
 "currency": "101", 
 "stock": "12", 
 "stockPrewarning": "12", 
 "source": "101", 
 "statusCode": "101", 
 "commodityCategoryCode": "13101501", 
 "commodityCategoryName": "tax", 
 "taxRate": "0.18", 
 "isZeroRate": "101", 
 "isExempt": "102", 
 "haveExciseTax": "101", 
 "exciseDutyCode": "LED010100", 
 "exciseDutyName": "LED010100", 
 "exciseRate": "0.12", 
 "pack": "1", 
 "stick": "1", 
 "remarks": "1", 
 "packageScaledValue": "12", 
 "pieceScaledValue": "1", 
 "pieceMeasureUnit": "101", 
 "havePieceUnit": "102", 
 "pieceUnitPrice": "110"， 
 "exclusion": "1"， 
 "haveOtherUnit": "101",  "serviceMark": "101", 
 "goodsTypeCode": "101", 
 "updateDateStr": "2022-01-14 13:43:00", "tankNo": "137465834749262155", 
	  
  
  
 }] 
} 	"commodityGoodsExtendEntity": { 
 "customsMeasureUnit": "NTT", 
 "customsUnitPrice": "4", 
 "packageScaledValueCustoms": "1", 
 "customsScaledValue": "2.5" 
}, 
"goodsOtherUnits": [{ 
 "id": "210059212594887180", 
 "commodityGoodsId": "210059212594887178", 
 "otherScaled": "10", 
 "otherUnit": "AF", 
 "otherPrice": "6999.99", 
 "packageScaled": "1" 
}] 
Flow Description 	Goods/Services Inquiry if haveOtherUnit =101 goodsOtherUnits can Not empty if haveOtherUnit =102 goodsOtherUnits is empty 
Field description 
Field 	Field Name 	Required 	Length 	Description 
goodsCode 	goodsCode 	N 	50 	 
goodsName 	goodsName 	N 	200 	 
commodityCate goryName 	commodityCategor yName 	 
N 	200 	 
pageNo 	current page number 	Y 	10 	 
pageSize 	How many records are displayed per page 	Y 	3 	Cannot be greater than the integer 100 
branchId 	branchId 	N 	18 	 
serviceMark 	serviceMark 	N 	3 	101:yes 
102:no 
haveExciseTax 	haveExciseTax 	N 	3 	101:yes 
102:no 
startDate 	startDate 	N 	Date 	yyyy-MM-dd 
endDate 	endDate 	N 	Date 	yyyy-MM-dd 
combineKeywor ds 	combineKeywords 	N 	50 	The query contains: goodsCode or goodsName 
goodsTypeCode 	goodsTypeCode 	N 	3 	Can be empty.default value is 
101. 
 
101: Non-fuel Goods 
102: Fuel 
tin 	tin 	N 	20 	 
queryType 	queryType 	N 	1 	QueryType, can be empty, the value is 1/0, and the default value is 1. 
 
1: Normal goods query  
0: Agent goods query  
 
When queryType is 0,tin and branchId can not be empty 
 
Field 	Field Name 	Required 	Length 	Description 
id 	Goods id 	Y 	18 	 
goodsName 	Goods Name 	Y 	100 	 
goodsCode 	Goods Code 	Y 	50 	 
measureUnit 	Measure Unit 	Y 	3 	T115 rateUnit 
unitPrice 	unitPrice 	Y 	Number 	 
currency 	currency 	Y 	10 	currencyType 
stock 	stock 	Y 	Number 	 
stockPrewarnin g 	stockPrewarning 	Y 	Number 	 
source 	source 	Y 	3 	source(101:URA ; 102:Taxpayer) 
statusCode 	status 	Y 	3 	101:enable ; 102 disable 
commodityCate goryCode 	commodityCategor yCode 	Y 	18 	 
commodityCate goryName 	commodityCategor yName 	Y 	200 	 
taxRate 	taxRate 	Y 	1024 	 Correspond tax ratecodeTAX_RATE_CODE  
taxRate 
0.18 18% 
isZeroRate 	isZeroRate 	Y 	3 	101:Y   
				102:N 
isExempt 	isExempt 	Y 	 	101:Y   102:N 
haveExciseTax 	haveExciseTax 	Y 	3 	Is there excise tax (101:yes ; 102:no) 
exciseDutyCod e 	exciseDutyCode 	Y 	20 	 
exciseDutyNam
e 	exciseDutyName 	Y 	500 	 
exciseRate 	exciseRate 	Y 	Number 	 
pack 	pack 	Y 	Number 	 
stick 	stick 	Y 	Number 	 
remarks 	remarks 	Y 	1024 	 
totalSize 	Total number of articles 	Y 	Number 	 
pageCount 	total pages 	Y 	 	 
packageScaled Value 	packageScaledValu e 	Y 	Number 	 
pieceScaledVal ue 	pieceScaledValue 	Y 	Number 	 
pieceMeasureU
nit 	pieceMeasureUnit 	Y 	3 	 
havePieceUnit 	havePieceUnit 	Y 	3 	 
pieceUnitPrice 	pieceUnitPrice 	Y 	Number 	 
exclusion 	exclusion 	Y 	1 	0:Zero 
1:Exempt 
2:No exclusion 
3:Both 0% & '-' 
haveOtherUnit 	haveOtherUnit 	Y 	3 	Is there other unit (101:yes ; 
102:no) 
serviceMark 	serviceMark 	N 	3 	101:yes 
102:no 
goodsTypeCode 	goodsTypeCode 	N 	3 	101: Goods 
102: Fuel 
updateDateStr 	updateDateStr 	N 	Date 	 
tankNo 	tankNo 	N 	50 	 
Customs UoM: 
Field 	Field Name 	Required 	Length 	Description 
customsMeasur eUnit 	customsMeasureUn it 	Y 	3 	T115 exportRateUnit 
customsUnitPr	customsUnitPrice 	Y 	Number 	Integer digits cannot exceed 
ice 				12, decimal digits cannot exceed 8; 
packageScaled ValueCustoms 	packageScaledVal ueCustoms 	Y 	Number 	Integer digits cannot exceed 12, decimal digits cannot exceed 8; 
customsScaled
Value 	customsScaledVal ue 	Y 	Number 	Integer digits cannot exceed 12, decimal digits cannot exceed 8; 
 
goodsOtherUnits 
Field 	Field Name 	Required 	Length 	Description 
id 	goodsOtherUnits 
id 	N 	18 	 
commodityGoo
dsId 	Goods id 	N 	18 	 
otherUnit 	otherUnit 	N 	3 	T115 rateUnit 
otherPrice 	otherPrice 	Y 	Number 	 
otherScaled 	otherScaled 	N 	Number 	Integer digits cannot exceed 
12, decimal digits cannot exceed 8; 
packageScaled 	packageScaled 	N 	Number 	Integer digits cannot exceed 
12, decimal digits cannot exceed 8; 



 
28.	Query the stock quantity by goods id 
Interface Name 	Query the stock quantity by goods id 
Description 	Query the stock quantity by goods id 
Interface Code 	T128 
Request Encrypted 	Y 
Response Encrypted 	Y 
Request Message 	{ 
 	"id": "290707933831281139", 
    "branchId": "298324457142214047" 
} 
Response Message 	{ 
 	"stock": "12", 
 	"stockPrewarning": "10" 
} 
Flow Description 	Query the stock quantity by goods id 
Field description 
Field 	Field Name 	Required 	Length 	Description 
id 	 	Goods id 	Y 	18 	 
branchId 	branchId 	N 	18 	 
 
Field 	Field Name 	Required 	Length 	Description 
stock 	 	currency 	Y 	Number 	 
stockPrewarnin g 	stockPrewarning 	Y 	Number 	 
 


29.	Batch Invoice Upload 
Interface Name 	Batch Invoice Upload 
Description 	Batch Invoice Upload 
Interface Code 	T129 	
Request Encrypted 	Y 		
Response Encrypted 	Y 		
Request Message 	[ 
 
 
 	{ 
 
 	"invoiceContent": "T109 Request information plaintext", 
"invoiceSignature": "JKQWJK34K32JJEK2JQWJ5678" 
	 
] 	} 	
Response Message 	[ 
 
 
 
 	{ 
 
 
 	"invoiceContent": "T109 Response information plaintext", 
"invoiceReturnCode": "00", 
"invoiceReturnMessage": "SUCCESS" 
	 
] 	} 	
Flow Description 	Batch Invoice Upload 
Field description 
Field 	Field Name 	Required 	Length 	Description 
invoiceContent 	invoiceContent 	Y 	Unlimite d 	 
invoiceSignatur e 	Signature value 	Y 	Unlimite d 	 
 
Field 	Field Name 	Required 	Length 	Description 
invoiceContent 	Invoice Content 	Y 	Unlimite d 	 
invoiceReturnC ode 	Invoice Return Message 	Y 	Unlimite d 	 
invoiceReturnM essage 	Invoice Return Message 	Y 	Unlimite d 	When the "returnCode" value is 
99, the exception information will be assigned to the field. 
 


 
30.	Goods Upload 
Interface Name 	Goods Upload 
Description 	Goods Upload 
Interface Code 	T130 
Request Encrypted 	Y 
Response Encrypted 	Y 
Request Message 	[{ 
 "operationType": "101", 
 "goodsName": "apple",  "goodsCode": "001", 
 "measureUnit": "101", 
 "unitPrice": "6999.99", 
 "currency": "101", 
 "commodityCategoryId": "10111301", 
 "haveExciseTax": "101", 
 "description": "1", 
 "stockPrewarning": "10", 

	 "pieceMeasureUnit": "101",  "havePieceUnit": "101", 
 "pieceUnitPrice": "12.34", 
 "packageScaledValue": "1", 
 "pieceScaledValue": "1", 
 "exciseDutyCode": "LED010100", 
 "haveOtherUnit": "1", 
 "goodsTypeCode": "101", 
 "commodityGoodsExtendEntity": { 
  "customsMeasureUnit": "NTT", 
  "customsUnitPrice": "4", 
  "packageScaledValueCustoms": "1", 
  "customsScaledValue": "2.5" 
 }, 
 "goodsOtherUnits": [{ 
  "otherUnit": "AF", 
  "otherPrice": "6999.99", 
  "otherScaled": "10", 
  "packageScaled": "1" 
 }] 
}] 
Response Message 	[{ 
 "operationType": "101", 
 "goodsName": "apple",  "goodsCode": "001", 
 "measureUnit": "101", 
 "unitPrice": "6999.99", 
 "currency": "101", 
 "commodityCategoryId": "10111301", 
 "haveExciseTax": "101", 
 "description": "1", 
 "stockPrewarning": "10", 
 "pieceMeasureUnit": "101",  "havePieceUnit": "101", 
 "pieceUnitPrice": "12.34", 
 "packageScaledValue": "1", 
 "pieceScaledValue": "1", 
 "exciseDutyCode": "1", 
 "haveOtherUnit": "101", 
 "goodsTypeCode": "101", 
 "commodityGoodsExtendEntity": { 
  "customsMeasureUnit": "NTT", 
	  "customsUnitPrice": "4", 
  "packageScaledValueCustoms": "1", 
  "customsScaledValue": "2.5" 
 }, 
 "goodsOtherUnits": [{ 
  "otherUnit": "AF", 
  "otherPrice": "6999.99", 
  "otherScaled": "10", 
  "packageScaled": "1" 
 }], 
 "returnCode": "601", 
 "returnMessage": "MeasureUnit:Invalid field value!" 
}] 
Flow Description 	All goods are uploaded successfully, and the return message is empty. If there is any failure, the goods will be returned 
Field description 
Field 	Field Name 	Required 	Length 	Description 
operationType 	operationType 	N 	3 	101: add goods(default) 102: modify product 
goodsName 	Goods Name 	Y 	200 	Goodsname cannot be empty, cannot be greater than 200 
characters 
goodsCode 	Goods Code 	Y 	50 	Goodscode cannot be empty, cannot be greater than 50 
characters 
measureUnit 	Measure Unit 	Y 	3 	T115 rateUnit 
unitPrice 	Unit Price 	Y 	Number 	Integer digits cannot exceed 
12, decimal digits cannot exceed 8; 
UnitPrice can be empty if it is service product 
currency 	currency 	Y 	3 	T115 currencyType 
commodityCate goryId 	commodityCategor yId 	Y 	18 	Commodity Category Id 
haveExciseTax 	haveExciseTax 	Y 	3 	101:Yes  102:No 
description 	description 	N 	1024 	 
stockPrewarnin	stockPrewarning 	Y 	24 	Integer digits cannot exceed 

g 				12, decimal digits cannot exceed 8; can be zero 
 
stockPrewarning can be empty if it is service product 
pieceMeasureU nit 	pieceMeasureUnit 	N 	3 	havePieceUnit is 102 pieceMeasureUnit must be empty! 
 
havePieceUnit is 101 pieceMeasureUnit cannot be 
empty 
 
T115 rateUnit 
havePieceUnit 	havePieceUnit 	Y 	3 	haveExciseTax is 101 ,excise duty has unit of 
Measurement,HavePieceUnit is 
101 
 
101:Yes 102:No 
pieceUnitPrice 	pieceUnitPrice 	N 	Number 	If havePieceUnit is 102, pieceUnitPrice must be empty! 
 
If havePieceUnit is 101, pieceUnitPrice cannot be empty.  
Integer digits cannot exceed 12, decimal digits cannot exceed 8; 
pieceUnitPrice can be empty if it is service product 
packageScaled Value 	packageScaledValu e 	N 	Number 	havePieceUnit is 102 packageScaledValue must be empty! 
 
havePieceUnit is 101 packageScaledValue cannot be empty 
 
Measureunit is equal to excise duty 
				measureunit,packageScaledValue must be equal to 1! 
 
Integer digits cannot exceed 12, decimal digits cannot exceed 8; 
pieceScaledVal ue 	pieceScaledValue 	N 	Number 	havePieceUnit is 102 pieceScaledValue must be empty! 
 
havePieceUnit is 101 pieceScaledValue  cannot be 
empty 
 
Measureunit is equal to excise 
duty measureunit pieceScaledValue must be equal to 1 
 
Integer digits cannot exceed 12, decimal digits cannot exceed 8; 
exciseDutyCod
e 	exciseDutyCode 	N 	20 	haveExciseTax is 102 exciseDutyCode must be empty! 
haveOtherUnit 	haveOtherUnit 	N 	3 	Is there other unit 
(101:yes ; 102:no) 
If 	'havePieceUnit 	: 
102',haveOtherUnit must be 
102! 
returnCode 	returnCode 	N 	10 	response 
returnMessage 	returnMessage 	N 	1024 	response 
goodsTypeCode 	goodsTypeCode 	N 	3 	101: Goods 
102: Fuel 
Not required. The default value is 101. 
Customs UoM: 
Field 	Field Name 	Required 	Length 	Description 
customsMeasur eUnit 	customsMeasureUn it 	Y 	3 	T115 exportRateUnit 
customsUnitPr ice 	customsUnitPrice 	Y 	Number 	Integer digits cannot exceed 12, decimal digits cannot exceed 8; 
packageScaled ValueCustoms 	packageScaledVal ueCustoms 	Y 	Number 	Integer digits cannot exceed 
12, decimal digits cannot 
				exceed 8; 
customsScaled
Value 	customsScaledVal ue 	Y 	Number 	Integer digits cannot exceed 12, decimal digits cannot exceed 8; 
Interface Name 	Goods Stock Maintain 
Description 	Goods Stock Maintain 
Interface Code 	T131 
Request Encrypted 	Y 
Response Encrypted 	Y 
Request Message 	{ 
 "goodsStockIn": { 
  "operationType": "101", 
  "supplierTin": "1010039929", 
  "supplierName": "Mr. EMUR SAM", 
  "adjustType": "101", 
  "remarks": "Increase inventory", 
  "stockInDate": "2020-09-01", 
 Other UoM: 
Field 	Field Name 	Required 	Length 	Description 
otherUnit 	otherUnit 	Y 	3 	T115 rateUnit 
otherUnit cannot be equal to measureunit 
 If 'havePieceUnit : 
101',otherUnit cannot be equal to pieceMeasureUnit 
otherPrice 	otherPrice 	N 	Number 	 
otherScaled 	otherScaled 	Y 	Number 	Integer digits cannot exceed 
12, decimal digits cannot exceed 8; 
packageScaled 	packageScaled 	Y 	Number 	Integer digits cannot exceed 
12, decimal digits cannot exceed 8; 
 



31.	Goods Stock Maintain 
	 
 
} 	 "stockInType": "101", 
 "productionBatchNo": "1200983", 
 "productionDate": "2020-09-01", 
 "branchId": "2020090132456", 
 "invoiceNo": "00000000001", 
 "isCheckBatchNo": "0", 
 "rollBackIfError": "0", 
 "goodsTypeCode": "101" 
}, 
"goodsStockInItem": [{ 
 "commodityGoodsId": "287700992426868373", 
 "goodsCode": "287700992426", 
 "measureUnit": "101", 
 "quantity": "100", 
 "unitPrice": "6999", 
 "remarks": "remarks", 
 "fuelTankId": "568654903587001037", 
 "lossQuantity": "10", 
 "originalQuantity": "110" }] 
Response Message 	[{ 
 "commodityGoodsId": "287700992426868373", 
 "goodsCode": "2877009924268", 
 "measureUnit": "101", 
 "quantity": "100", 
 "unitPrice": "6999", 
 "remarks": "remarks", 
 "fuelTankId": "568654903587001037", 
 "lossQuantity": "10", 
 "originalQuantity": "110", 
 "returnCode": "601", 
 "returnMessage": "MeasureUnit:Invalid field value!" }] 
Flow Description 	The goods inventory is uploaded successfully, and the return message is empty. If there is any failure, the data will be returned 
Field description 
Field 	Field Name 	Required 	Length 	Description 

operationType 	operationType 	Y 	3 	101:Increase inventory 
102:Inventory reduction 
supplierTin 	supplierTin 	N 	50 	If operationType = 102， supplierTin must be empty 
 
If stockInType= 103， supplierTin must be empty 
supplierName 	supplierName 	N 	100 	If operationType = 102， supplierName must be empty 
 
If stockInType= 103， supplierName must be empty 
 
 
If operationType = 101， supplierName cannot be empty 
 
adjustType 	adjustType 	N 	20 	101:Expired Goods 
102:Damaged Goods 
103:Personal Uses 
105:Raw Material(s) 
104:Others. (Please specify) 
 
If operationType = 101， adjustType must be empty  
If operationType = 102， adjustType cannot be empty 
 
adjustType Multiple are separated by commas, 
Eg: adjustType= '101,102'  
remarks 	remarks 	N 	1024 	If operationType = 102， adjustType = 104 remarks cannot be empty 
stockInDate 	stockInDate 	N 	date 	The time format must be yyyy-
MM-dd 
stockInType 	stockInType 	N 	3 	101:Import 
102:Local Purchase 
103:Manufacture/Assembling 104:Opening Stock 

				 
If operationType = 101， stockInType cannot be empty 
 
If operationType = 102， stockInType must be empty 
 
productionBat chNo 	productionBatchN o 	N 	50 	If 'stockInType : Not equal to 103',productionBatchNo must be empty! 
productionDat e 	productionDate 	N 	date 	The time format must be yyyy-
MM-dd 
 If 'stockInType : Not equal to 103',productionDate must be empty! 
branchId 	branchId 	N 	18 	 
commodityGood sId 	commodityGoodsId 	N 	18 	commodityGoodsId and 
goodsCode cannot be empty at 
the same time 
goodsCode 	goodsCode 	N 	50 	commodityGoodsId and 
goodsCode cannot be empty at 
the same time 
measureUnit 	measureUnit 	N 	3 	T115 rateUnit 
quantity 	quantity 	Y 	Number 	Integer digits cannot exceed 
12, decimal digits cannot exceed 8; 
unitPrice 	unitPrice 	Y 	Number 	Commodity purchase price 
Integer digits cannot exceed 
12, decimal digits cannot exceed 8; 
unitPrice can be 0 
remarks 	remarks 	N 	1024 	goodsStockInItem-->remarks 
returnCode 	returnCode 	N 	10 	response 
returnMessage 	returnMessage 	N 	1024 	response 
invoiceNo 	invoiceNo 	N 	20 	 
isCheckBatchN o 	isCheckBatchNo 	N 	1 	0:No 
1:Yes 
It is not required. The default value is 0. 
rollBackIfErr	rollBackIfError 	N 	1 	0:No 1:Yes 
or 				It is not required. The default value is 0. 
fuelTankId 	fuelTankId 	N 	18 	 
goodsTypeCode 	goodsTypeCode 	N 	3 	101: Goods 
102: Fuel 
Not required. The default value is 101. 
lossQuantity 	lossQuantity 	N 	Number 	Integer digits cannot exceed 12, decimal digits cannot 
exceed 8; 
originalQuant ity 	originalQuantity 	N 	Number 	Integer digits cannot exceed 12, decimal digits cannot 
exceed 8; 



32.	Upload exception log 
Interface Name 	Upload exception log 
Description 	Upload exception log 
Interface Code 	T132 
Request Encrypted 	Y 
Response Encrypted 	N 
Request Message 	[{ 
 	"interruptionTypeCode": "101", 
 	"description": "Login failed", 
 	"errorDetail": "Login failed", 
 	"interruptionTime": "2020-04-26 17:13:12" 
 
},{ 
 	"interruptionTypeCode": "101", 
 	"description": "Login failed", 
 	"errorDetail": "Login failed", 
 	"interruptionTime": "2020-04-26 17:13:12" 
 
}] 
Response Message 	Null 
Flow Description 	When the cash in machine logs in, upload the abnormal log information in the last login period. 
Field description 
Field 	Field Name 	Required 	Length 	Description 
interruptionTyp eCode 	interruptionTypeCo de 	Y 	3 	101:Number of Disconnected 
102:Login Failure 
103:Receipt Upload Failure 
104:System related errors 
105:Paper roll replacement 
description 	description 	Y 	3000 	 
errorDetail 	errorDetail 	N 	4000 	 
interruptionTim e 	interruptionTime 	Y 	Date 	yyyy-MM-dd HH24:mm:ss 
 


33.	TCS upgrade system file download 
Interface Name 	TCS upgrade system file download 
Description 	Query the files needed to upgrade the system by version number and operation type number, including uploading attachments and required sql files! 
Interface Code 	T133 
Request Encrypted 	Y 
Response Encrypted 	Y 
Request Message 	{ 
 	"tcsVersion": "1", 
 	"osType": "1" 
} 
Response Message 	{ 
    "precommand": "/as/",  
    "precommandurl": "./jmeter/bin",  
    "precommandfilename": "abc.txt",  
    "command": "000",  
    "commandurl": "./home/tomcat",  
    "commandfilename": "a.docx",  
    "tcsversion": "1",  
    "fileList": [ 
	        { 
            "updatefile": "?????",  
            "iszip": "1",  
            "updateurl": "/asd/fsd",  
            "deleteurl": "/ad/fsads",  
            "ordernumber": "1" 
        } 
    ],  
    "sqlList": [ 
        { 
            "updatesql": "select * from T_INVOICE_DETAILS;",  
            "ordernumer": 3 
        } 
    ] 
} 
Flow Description 	Return the file information required for system upgrade through request parameters 
Field description 
Field 	Field Name 	Required 	Length 	Description 
tcsVersion 	tcsVersion 	Y 	number 	TCS version is a number starting from 1 
osType 	osType 	Y 	1 	0:linux    1:windows 
precommand 	precommand 	Y 	clob 	Precommand FileStream Base64 string 
precommandur
l 	precommandurl 	Y 	256 	 precommandurl 
precommandfil ename 	precommandfilena me 	N 	500 	precommandfilename 
command 	command 	Y 	clob 	Command FileStream Base64 string 
commandurl 	commandurl 	Y 	256 	commandurl 
commandfilena me 	commandfilename 	N 	500 	commandfilename 
updatefile 	updatefile 	Y 	CLOB 	updatefile 
iszip 	iszip 	N 	 	iszip 
updateurl 	updateurl 	Y 	256 	updateurl 
deleteurl 	deleteurl 	Y 	256 	deleteurl 
ordernumber 	ordernumber 	Y 	10 	Execution sequence 
updatesql 	updatesql 	Y 	CLOB 	Sql file 
 




34.	Commodity category incremental update 
Interface Name 	Commodity category incremental update 
Description 	Returns only the commodity category changes since the local version up to current version. 
Interface Code 	T134 
Request Encrypted 	Y 	
Response Encrypted 	Y 	
Request Message 	{ 
 
} 	"commodityCategoryVersion": "1.0" 
Response Message 	[{ 
 
 
 	 	"commodityCategoryCode": "100000000", 
 	"parentCode": "0", 
 	"commodityCategoryName": "Standard", 
 	"commodityCategoryLevel": "1", 
 	"rate": "0.18", 
 	"isLeafNode": "101", 
 	"serviceMark": "101", 
 	"isZeroRate": "101", 
 	"zeroRateStartDate": "01/12/2019", 
 	"zeroRateEndDate": "05/12/2019", 
 	"isExempt": "101", 
 	"exemptRateStartDate": "06/12/2019", 
 	"exemptRateEndDate": "10/12/2019", 
 	"enableStatusCode": "1", 
 	"exclusion": "1" 
 "excisable": "101", 
    "vatOutScopeCode": "102" 
}, { 
 	"commodityCategoryCode": "100000000", 
 	"parentCode": "0", 
 	"commodityCategoryName": "Standard", 
 	"commodityCategoryLevel": "1", 
 	"rate": "0.18", 
 	"isLeafNode": "101", 
	 	 	"serviceMark": "101", 
 	 	"isZeroRate": "101", 
 	 	"zeroRateStartDate": "01/12/2019", 
 	 	"zeroRateEndDate": "05/12/2019", 
 	 	"isExempt": "101", 
 	 	"exemptRateStartDate": "06/12/2019", 
 	 	"exemptRateEndDate": "10/12/2019", 
 	 	"enableStatusCode": "1", 
 	 	"exclusion": "1" 
  "excisable": "101", 
     "vatOutScopeCode": "102" 
 	}] 
Flow Description 	1.	Check T103. If the commodityCategoryVersion is higher than local, then call T134 and specify the local version. 
2.	Loop through the results. If the returned category code exists in the local repository, delete it and insert the one returned. If it does not exist, then insert it into the local repository. continue until all items are processed. 
3.	Update the version of the local repository. 
Field description 
Field 	Field Name 	Required 	Length 	Description 
commodityCate goryVersion 	commodityCategor yVersion 	Y 	Number 	Local commodityCategoryVersion 
commodityCate goryCode 	commodityCategor yCode 	Y 	18 	 
parentCode  	parentCode 	Y 	18 	 
commodityCate goryName 	commodityCategor yName 	Y 	200 	 
commodityCate goryLevel 	commodityCategor yLevel 	Y 	1 	 
rate 	rate 	Y 	4 	 Correspond tax ratecodeTAX_RATE_CODE  
taxRate 
0.18 18% 
isLeafNode 	isLeafNode 	Y 	3 	101:Y  102:N 
serviceMark 	serviceMark 	Y 	3 	101:Y  102:N 
isZeroRate 	isZeroRate 	Y 	3 	101:Y  102:N 
zeroRateStartD ate 	zeroRateStartDate 	N 	Date 	 
zeroRateEndDa
te 	zeroRateEndDate 	N 	Date 	 
isExempt 	isExempt 	Y 	3 	101:Y  102:N 
exemptRateStar tDate 	exemptRateStartDa te 	N 	Date 	 
exemptRateEnd Date 	exemptRateEndDat e 	N 	Date 	 
enableStatusCo de 	enableStatusCode 	Y 	1 	1:enable: 0:disable 
exclusion 	exclusion 	Y 	1 	0:Zero  
1:Exempt  
2:No exclusion 
3:Both 0% & '-' 
excisable 	excisable 	Y 	3 	101:Y   
102:N 
vatOutScopeCo de 	VAT Out OF Scope 	Y 	3 	101:Yes 
102:No 
35.	Get Tcs Latest Version 
   
Interface Name 	Get Tcs Latest Version 
Description 	Get Tcs Latest Version 
Interface Code 	T135 
Request Encrypted 	N 
Response Encrypted 	Y 
Request Message 	NULL 
Response Message 	{ 
   "latesttcsversion":"5" 
} 
Flow Description 	Get Tcs Latest Version 
Field description 
Field 	Field Name 	Required 	Length 	Description 
latesttcsversion 	latesttcsversion 	Y 	Number 	 
 


 
36.	Certificate public key upload 
   
Interface Name 	Certificate public key upload 
Description 	Certificate public key upload 
Interface Code 	T136 
Request Encrypted 	N 
Response Encrypted 	N 
Request Message 	{ 
 	"fileName": "Certum Trusted NetWork CA 2.cer", 
 	"verifyString": "MDQwNDAxMDcxNVowMzELMAkGA1UEBhMCRU4x",  	"fileContent": 
"MIIDFjCCAf6gAwIBAgIRAKPGAol99EKUPlA/VZYC+u8wDQYJKoZIhvcNAQELB QAwMzELMAkGA1UEBhMCRU4xJDAiBgNVBAMMG0NlcnR1bSBUcnVzdGVkIE5 ldFdvcmsgQ0EgMjAgFw0wMDA0MTkwMTA3MTVaGA8yMDYwMDQwNDAxM DcxNVowMzELMAkGA1UEBhMCRU4xJDAiBgNVBAMMG0NlcnR1bSBUcnVzdG VkIE5ldFdvcmsgQ0EgMjCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCg gEBANEC+sWUcfJFToC57ghh7WvGLDrfx5lIp0yrZDEiHXtx32GqAFokXmwzJ82i DVwIrbDSIf62NBQ5zt5NENdk5oi36rwYlDNWMTEs8rtwGMWJuiZRMaleVPVjL1
Ecf2T4cCWiGw83qvNyWDAd4OaYV0DCvBe3YPR7bOKrznwEv/Eycp+NiBOkpid
Ynyrdb/A4gsMBuEKYjIQ3z5lrrEuAUrpJADf2jlxTTJ7ede1Dmyga1yzoOeAuc0ZLE JKaqNG2cwK+tOZ9W7OL/KmHgY/+FhMOd9xzuJoEJnFycjn5x7Ha1+GyScMPU acT3Z3X9+ukYXyQriyAavLOwwTYdZ4hn+ECAwEAAaMjMCEwDwYDVR0TAQH /BAUwAwEB/zAOBgNVHQ8BAf8EBAMCAQYwDQYJKoZIhvcNAQELBQADggEB
AHIGw8c873dM1gMglwffWS9hx8U+36S3z2zmJPELJo/Vf9qsl+75UCRL0ORagy
X1yy5rxN+Wf5TXlHluEosjC+aR0P4NXUqKF9bSz8H4Q/yPgjR0tjiWKDHpxCMdz SGhpVFcdBCHUu2o25k2IeKdw8gm5lkZQW1CxgQpb/C8xwzwD8faqwPKMEf+ m96axUoVzi9fgnnP+awERdUVJEhFo6JJVKIX8mTbQv83VC3gI5eq/xSprXEwQy QvELJ9S1TvJtkqbSdgRrnCEdpkIoFa8huM6zfj1WEBRxteoo6PH46un4FGj4N6ioI
GzVr9G40uhQGdm16ZU+q44XjW2oUnI9w=" 
} 
Response Message 	NULL 
Flow Description 	Certificate public key upload 
Field description 
Field 	Field Name 	Required 	Length 	Description 
fileName 	fileName 	Y 	256 	FileName must be in '.crt' and '.cer' format! 
verifyString 	verifyString 	Y 	Unlimite d 	TIN Intercept the top 10 + yymmdd as AES Key to encrypt file name 
fileContent 	fileContent 	Y 	Unlimite d 	base64 string 



37.	Check exempt/Deemed taxpayer 
   
Interface Name 	Check exempt/Deemed taxpayer 
Description 	Check whether the taxpayer is tax exempt/Deemed 
Interface Code 	T137 
Request Encrypted 	Y 	
Response Encrypted 	Y 	
Request Message 	{  
} 	"tin": "1009830845", 
"commodityCategoryCode": "10000000,10000001", 
Response Message 	{ 
 
 
 	"taxpayerType": "101", 
"exemptType": "101", 
"commodityCategory": [{ 
 "commodityCategoryCode": "10000000", 
 "commodityCategoryTaxpayerType": "101" }], 
"deemedAndExemptProjectList": [{ 
 "projectId": "10000000", 
 "projectName": "101", 
 "deemedExemptCode": "101", 
 "commodityCategoryCode": "10000000", 
 "serviceMark": "101", 
 "unit": "101", 
 "currentQty": "101", 
	  "currentAmount": "101" 
 }] 
} 
Flow Description 	Check whether the taxpayer is tax exempt/Deemed by TIN and corresponding commodityCategoryCode 
Field description 
Field 	Field Name 	Required 	Length 	Description 
tin 	fileName 	Y 	20 	 
commodityCate goryCode 	commodityCategor yCode 	N 	18 	commodityCategoryCode. 
Multiple codes are separated by commas 
taxpayerType 	taxpayerType 	Y 	3 	101	normal taxpayer 
102	exempt taxpayer  
103	Deemed taxpayer 
104	Both(Deemed & Exempt) 
exemptType 	exemptType 	N 	3 	101	VAT（VAT tax exemption）  
102	Excise Duty（Excise Duty tax exemption） 
 
103	Both（Both VAT and Excise 
Duty tax exemption） 
commodityCate goryTaxpayerTy
pe 	commodityCategor yTaxpayerType 	N 	3 	101	normal taxpayer 
102	exempt taxpayer  
103	Deemed taxpayer 
104	Both(Deemed & Exempt) 
 
Field 	Field Name 	Required 	Length 	Description 
projectId 	projectId 	Y 	18 	To be used in T109 when deemed flag is 1 
projectName 	projectName 	Y 	100 	To be used in T109 when deemed flag is 1 
deemedExemptC ode 	deemedExemptCode 	Y 	3 	101:Strategic Investor 
102:Petroleum Licensee 103:Aid funded project 
Contractor 
104:Government MDA 
				105:VAT & Excise Duty Exempt 
106:Excise Duty Exempt 
107:Mining Licensee 
108:EACOP Licensee 
109:EACOP Level 1 Contractor 
commodityCate goryCode 	commodityCategor yCode 	Y 	18 	 
serviceMark 	serviceMark 	Y 	3 	101:Y   
102:N 
unit 	unit 	Y 	3 	T115 rateUnit 
currentQty 	currentQty 	N 	Number 	 
currentAmount 	currentAmount 	Y 	Number 	 
 


38.	Get all branches 
   
Interface Name 	Get all branches 
Description 	Returns all branches 
Interface Code 	T138 
Request Encrypted 	N 
Response Encrypted 	Y 
Request Message 	NULL 
Response Message 	[{ 
  "branchId": "206637525568955296", 
  "branchName": "Mr. STEPHEN BUNJO"  }, { 
  "branchId": "206637528324276772", 
  "branchName": "ARINAIT AND SONS CO. LIMITED" }] 
Flow Description 	Get all branches by current tin 
Field description 
Field 	Field Name 	Required 	Length 	Description 
branchId 	branchId 	Y 	18 	 
branchName 	branchName 	Y 	500 	 
39.	Goods Stock Transfer 
   
Interface Name 	Goods Stock Transfer 
Description 	Transfer of stock between branches. 
Interface Code 	T139 
Request Encrypted 	Y 	
Response Encrypted 	Y 	
Request Message 	{ 
 
} 	"goodsStockTransfer": { 
 "sourceBranchId": "206637525568955296", 
 "destinationBranchId": "206637528324276772", 
 "transferTypeCode": "101", 
 "remarks": "Others", 
 "rollBackIfError": "0", 
 "goodsTypeCode": "101" 
}, 
"goodsStockTransferItem": [{ 
 "commodityGoodsId": "287700992426868373", 
 "goodsCode": "287700992426", 
 "measureUnit": "101", 
 "quantity": "100", 
 "remarks": "Others", 
 "sourceFuelTankId": "568654903587001037", 
 "destinationFuelTankId": "568654903587001037" }] 
Response Message 	[{ 
 "commodityGoodsId": "287700992426868373", 
 "measureUnit": "100", 
 "quantity": "100", 
 "remarks": "Others", 
 "sourceFuelTankId": "568654903587001037", 
 "destinationFuelTankId": "568654903587001037", 
 "returnCode": "601", 
 "returnMessage": "quantity:Invalid field value!" }] 
Flow Description 	Goods Stock Transfer 
Field description 
GoodsStockTransfer field: 
Field 	Field Name 	Required 	Length 	Description 	
commodityGood sId 	commodityG	oodsIdcommod 	ityGoodsId
Y 	 and good18 	sCode cannot be empty at the same ti	
					 	
goodsCode 	goodsCode 	N 	50 	commodityGoodsId and goodsCode cannot be empty at the same time 	
measureUnit 	measureUnit 	N 	3 	T115 rateUnit 	
quantity 	quantity 	 
Y 	18 	 	
 
Field 	Field Name 	Required 	Length 	Description 
sourceBranchI d 	sourceBranchId 	Y 	18 	The branchId of the source branch of the goods.sourceBranchId and destinationBranchId cannot be the same. 
destinationBr anchId 	destinationBranc hId 	Y 	18 	The branchId of the destination branch for the goods. transferredBranchId and receivedBranchId cannot be the same! 
transferTypeC ode 	transferTypeCode 	Y 	3 	101	Out of Stock Adjust 
102	Error Adjust  
103	Others (Please Specify) 
 
Support multiple selections, separated by commas, 
Eg: transferTypeCode= 
'101,102' 
remarks 	remarks 	N 	1024 	If transferTypeCode = 
103,remarks can not be empty! 
rollBackIfErr or 	rollBackIfError 	N 	1 	0:No 1:Yes 
It is not required. The default value is 0. 
 
GoodsStockTransferItem field:  
remarks 	remarks 	N 	1024 	 
returnCode 	returnCode 	N 	10 	Leave empty in the request. It will be populated with the status code in the response. 
returnMessage 	returnMessage 	N 	1024 	Leave empty in the request. It will be populated with the status code in the response. 



40. Goods/Services Inquiry by goods Code 
Interface Name 	Goods/Services Inquiry by goods Code 
Description 	Goods/Services Inquiry by goods Code 
Interface Code 	T144 
Request Encrypted 	Y 
Response Encrypted 	Y 
Request 
Message 	{ 
 "goodsCode": "0001,0002", 
 "tin": "1009837013" 
} 
Response 
Message 	[{ 
 "goodsCode": "0001", 
 "measureUnit": "101", 
 "havePieceUnit": "101", 
 "pieceMeasureUnit": "101",  "haveOtherUnit": "101", 
 "packageScaledValue": "1", 
 "pieceScaledValue": "500", 
 "goodsOtherUnits": [{ 
  "otherUnit": "AF", 
  "otherScaled": "1000", 
  "packageScaled": "1" 
 }] 
}] 
Flow Description 	Batch query goods by goodsCode array. 
Query result data is the goods with status enabled 
Field description 
Field 	Field Name 	Required 	Length 	Description 
goodsCode 	goodsCode 	Y 	Unlimit ed 	Goodscode support multiple parameters, split,for example:“0001,0002” 
tin 	tin 	N 	20 	Principal agent TIN 
 
Field 	Field Name 	Required 	Length 	Description 
goodsCode 	Goods Code 	Y 	50 	 
measureUnit 	Measure Unit 	Y 	3 	T115 rateUnit 
pieceMeasureU nit 	pieceMeasureUnit 	N 	3 	If havePieceUnit= 101， pieceMeasureUnit cannot be empty  
If havePieceUnit= 102， pieceMeasureUnit must be empty 
havePieceUnit 	havePieceUnit 	Y 	3 	101:Y 102:N 
haveOtherUnit 	haveOtherUnit 	Y 	3 	Is there other unit (101:yes ; 
102:no) 
packageScaled
Value 	packageScaledVal ue 	Y 	Number 	 
pieceScaledVa lue 	pieceScaledValue 	 
Y 	Number 	 
otherUnit 	otherUnit 	 N 	3 	T115 rateUnit 
otherScaled 	otherScaled 	Y 	Number 	 
packageScaled 	packageScaled 	Y 	Number 	 
 



41. Goods Stock recods query 
Interface Name 	Goods Stock recods query 
Description 	Goods Stock recods query 
Interface Code 	T145 
Request Encrypted 	Y 
Response Encrypted 	Y 
Request 
Message 	{ 
 "productionBatchNo": "00000000001", 
 "invoiceNo": "320001127399", 
 "referenceNo": "425502528294126235", 
 "pageNo": "1", 
 "pageSize": "10" 
} 
Response 
Message 	{ 
 "page": { 
  "pageNo": "1", 
  "pageSize": "10", 
  "totalSize": " Total number of articles ", 
  "pageCount": "total pages" 
 }, 
 "records": [{ 
  "supplierTin": "1010039929", 
  "supplierName": "Mr. EMUR SAM", 
  "adjustType": "101", 
  "remarks": "Increase inventory", 
  "stockInDate": "2020-09-01", 
  "stockInType": "101", 
  "productionBatchNo": "1200983", 
  "productionDate": "2020-09-01", 
  "branchId": "2020090132456", 
  "invoiceNo": "320001127399", 
  "referenceNo": "425502528294126235", 
  "branchName": "PARAMOUR COSMETICS LIMITED", 
  "totalAmount": "1000.00" 
 }] 
} 
Flow Description 	Goods Stock recods query 
'productionBatchNo'、'invoiceNo'、'referenceNo' cannot be empty at the same time! 
Field description 
Field 	Field Name 	Required 	Length 	Description 
productionBat chNo 	productionBatchN o 	N 	50 	 
invoiceNo 	Invoice number 	N 	20 	The query debitnote corresponds to the Invoice No. of the positive ticket 
referenceNo 	referenceNo 	N 	50 	 
pageNo 	current page number 	Y 	10 	 
pageSize 	How many records are displayed per page 	Y 	3 	Cannot be greater than the integer 100 
 
Field 	Field Name 	Required 	Length 	Description 
supplierTin 	supplierTin 	N 	50 	 
supplierName 	supplierName 	N 	100 	 
adjustType 	adjustType 	N 	3 	101:Expired Goods 
102:Damaged Goods 
103:Personal Uses 
105:Raw Material(s) 
104:Others. (Please specify) 
remarks 	remarks 	N 	1024 	 
stockInDate 	stockInDate 	N 	date 	 
stockInType 	stockInType 	N 	3 	101:Import 
102:Local Purchase 
103:Manufacture/Assembling 
104:Opening Stock 
productionBat chNo 	productionBatchN o 	N 	50 	If 'stockInType : Not equal to 103',productionBatchNo must be empty! 
productionDat e 	productionDate 	N 	date 	If 'stockInType : Not equal to 103',productionDate must be empty! 
invoiceNo 	invoiceNo 	N 	20 	 
referenceNo 	referenceNo 	N 	50 	 
branchId 	branchId 	N 	18 	 
branchName 	branchName 	N 	500 	 
totalAmount 	totalAmount 	N 	Number 	 




42. Query Commodity Category / Excise Duty by issueDate 
Interface Name 	Query Commodity Category /Excise Duty by issueDate 
Description 	Query Commodity Category /Excise Duty by issueDate 

Interface Code 	T146 
Request Encrypted 	Y 	
Response Encrypted 	Y 	
Request 
Message 	{ 
 
 
 
} 	"categoryCode": "00000000001", 
"type": "1", 
"issueDate": "2021-06-23 17:13:12" 
Response 
Message 	{ 
 
 	"commodityCategory": { 
 "commodityCategoryCode": "100000000", 
 "parentCode": "0", 
 "commodityCategoryName": "Standard", 
 "commodityCategoryLevel": "1", 
 "rate": "0.18", 
 "isLeafNode": "101", 
 "serviceMark": "101", 
 "isZeroRate": "101", 
 "zeroRateStartDate": "01/12/2019", 
 "zeroRateEndDate": "05/12/2019", 
 "isExempt": "101", 
 "exemptRateStartDate": "06/12/2019", 
 "exemptRateEndDate": "10/12/2019", 
 "enableStatusCode": "1", 
 "exclusion": "1" 
 "excisable": "101", 
    "vatOutScopeCode": "102" 
}, 
"exciseDuty": { 
 "effectiveDate": "02/01/2020", 
 "exciseDutyCode": "LED010300", 
 "goodService": "Un-denatured spirits m", 
 "id": "320389606969887681", 
 "isLeafNode": "1", 
 "parentCode": "LED010000", 
 "rateText": "60%,UGX2000 per Kg", 
 "exciseDutyDetailsList": [{ 
  "currency": "101", 
  "exciseDutyId": "320389606969887681", 
  "rate": "2000", 
	   "type": "102", 
   "unit": "103" 
  }] 
 } 
} 
Flow Description 	Query Commodity Category /Excise Duty 
Field description 
Field 	Field Name 	Required 	Length 	Description 
categoryCode 	categoryCode 	Y 	20 	 
type 	type 	Y 	1 	1:Commodity Category  
2:Excise Duty 
issueDate 	issueDate 	Y 	date 	yyyy-MM-dd HH24:mm:ss 
commodityCategory 
Field 	Field Name 	Required 	Length 	Description 
commodityCate goryCode 	commodityCategor yCode 	Y 	18 	 
parentCode  	parentCode 	Y 	18 	 
commodityCate goryName 	commodityCategor yName 	Y 	200 	 
commodityCate goryLevel 	commodityCategor yLevel 	Y 	1 	 
rate 	rate 	Y 	4 	 Correspond tax ratecodeTAX_RATE_CODE  taxRate 0.18 18% 
isLeafNode 	isLeafNode 	Y 	1 	101:Y  102:N 
serviceMark 	serviceMark 	Y 	1 	101:Y  102:N 
isZeroRate 	isZeroRate 	Y 	1 	101:Y  102:N 
zeroRateStart Date 	zeroRateStartDat e 	N 	Date 	 
zeroRateEndDa te 	zeroRateEndDate 	N 	Date 	 
isExempt 	isExempt 	Y 	1 	101:Y  102:N 
exemptRateSta rtDate 	exemptRateStartD ate 	N 	Date 	 
exemptRateEnd Date 	exemptRateEndDat e 	N 	Date 	 
enableStatusC ode 	enableStatusCode 	Y 	1 	1:enable: 0:disable 
exclusion 	exclusion 	Y 	1 	0:Zero  
1:Exempt  
2:No exclusion 
3:Both 0% & '-'  
excisable 	excisable 	Y 	3 	101:Y   
102:N 
vatOutScopeCo de 	VAT Out OF Scope 	Y 	3 	101:Yes 
102:No 
 exciseDuty 
Field 	Field Name 	Required 	Length 	Description 
id 	id 	Y 	20 	 
exciseDutyCod e 	exciseDutyCode 	Y 	20 	 
goodService 	goodService 	Y 	500 	 
parentCode 	Good parentCode 	Y 	20 	 
rateText 	tax rateText 	Y 	50 	 
exciseDutyId 	Good category ID 	Y 	18 	Corresponding dictionaryrateType 
isLeafNode 	isLeafNode 	Y 	1 	1:Y  0:N 
effectiveDate 	effectiveDate 	Y 	Date 	 
exciseDutyId 	exciseDutyId 	Y 	20 	 
type 	tax rate 
Calculate type 	Y 	10 	101	Percentage 
102	Unit of measurement 
rate 	tax rate 	Y 	number 	 
unit 	unit of measurement 	N 	3 	type=101 is empty type=102 is not empty 
Corresponding dictionarycode   rateUnit  
 
 
43. Goods Stock recods query (Different Condition) 
Interface Name 	Goods Stock recods query 
Description 	Goods Stock recods query, different with T145, only query the stock records of current branch  
Interface Code 	T147 

Request Encrypted 	Y 	
Response Encrypted 	Y 	
Request 
Message 	{ 
 
 
} 	"combineKeywords": "425502528294126235", 
"stockInType": "101", 
"startDate": "2021-09-10", 
"endDate": "2021-09-11", 
"pageNo": "1", 
"pageSize": "10", 
"supplierTin": "1009839122", 
"supplierName": "Mr. EMUR SAM" 
Response 
Message 	{ 
 

 
} 	"page": { 
 "pageNo": "1", 
 "pageSize": "10", 
 "totalSize": " Total number of articles ", 
 "pageCount": "total pages" 
}, 
"records": [{ 
 "supplierTin": "1010039929", 
 "supplierName": "Mr. EMUR SAM", 
 "remarks": "Increase inventory", 
 "stockInDate": "2020-09-01", 
 "stockInType": "101", 
 "productionBatchNo": "1200983", 
 "productionDate": "2020-09-01", 
 "branchId": "2020090132456", 
 "invoiceNo": "320001127399", 
 "referenceNo": "425502528294126235", 
 "branchName": "PARAMOUR COSMETICS LIMITED", 
 "totalAmount": "1000.00", 
 "id": "425502528294126235" 
}] 
Flow Description 	Goods Stock recods query 
Field description 
Field 	Field Name 	Required 	Length 	Description 
combineKeywor ds 	combineKeywords 	N 	50 	The query contains referenceno or suppliername  
stockInType 	stockInType 	N 	3 	101:Import 
102:Local Purchase 
103:Manufacture/Assembling 
104:Opening Stock 
startDate 	startDate 	N 	Date 	 
endDate 	endDate 	N 	Date 	yyyy-MM-dd 
pageNo 	current page number 	Y 	10 	yyyy-MM-dd 
pageSize 	How many records are displayed per page 	Y 	3 	Cannot be greater than the integer 100 
supplierTin 	supplierTin 	N 	50 	 
supplierName 	supplierName 	N 	100 	 
 
Field 	Field Name 	Required 	Length 	Description 
supplierTin 	supplierTin 	N 	50 	 
supplierName 	supplierName 	N 	100 	 
remarks 	remarks 	N 	1024 	 
stockInDate 	stockInDate 	N 	date 	 
stockInType 	stockInType 	N 	3 	101:Import 
102:Local Purchase 
103:Manufacture/Assembling 104:Opening Stock 
productionBat chNo 	productionBatchN o 	N 	50 	If 'stockInType : Not equal to 103',productionBatchNo must be empty! 
productionDat e 	productionDate 	N 	date 	If 'stockInType : Not equal to 103',productionDate must be empty! 
invoiceNo 	invoiceNo 	N 	20 	 
referenceNo 	referenceNo 	N 	50 	 
branchId 	branchId 	N 	18 	 
branchName 	branchName 	N 	500 	 
totalAmount 	totalAmount 	N 	Number 	 
Id 	id 	N 	18 	 
44. Goods Stock recods detail query 
Interface Name 	Goods Stock recods detail query 
Description 	Goods Stock recods detail query 
Interface Code 	T148 
Request Encrypted 	Y 	
Response Encrypted 	Y 	
Request 
Message 	{ 
 
} 	"id": "425502528294126235" 
Response 
Message 	{ 
 
 
 
 
} 	"goodsStockIn": { 
 "stockInType": "101", 
 "remarks": "Increase inventory", 
 "invoiceNo": "320001127399", 
 "branchId": "2020090132456", 
 "branchName": "PARAMOUR COSMETICS LIMITED", 
 "stockInDate": "2020-09-01", 
 "supplierTin": "1010039929", 
 "supplierName": "Mr. EMUR SAM", 
 "productionBatchNo": "1200983", 
 "productionDate": "2020-09-01" 
}, 
"goodsStockInGoods": [{ 
 "commodityGoodsId": "287700992426868373", 
 "goodsCode": "287700992426", 
 "goodsName": "test", 
 "measureUnit": "101", 
 "currency": "101", 
 "quantity": "100", 
 "unitPrice": "6999", 
 "amount": "69990.00" 
}] 



Flow Description 	Goods Stock recods detail query 
Field description 
	Field 	Field Name 	Required 	Length 	Description 
id 		id 	Y 	18 	 
 
Field 	Field Name 	Required 	Length 	Description 
supplierTin 	supplierTin 	N 	50 	 
supplierName 	supplierName 	N 	100 	 
remarks 	remarks 	N 	1024 	 
stockInDate 	stockInDate 	N 	date 	 
stockInType 	stockInType 	N 	3 	101:Import 
102:Local Purchase 
103:Manufacture/Assembling 104:Opening Stock 
productionBat chNo 	productionBatchN o 	N 	50 	If 'stockInType : Not equal to 103',productionBatchNo must be empty! 
productionDat e 	productionDate 	N 	date 	If 'stockInType : Not equal to 103',productionDate must be empty! 
invoiceNo 	invoiceNo 	N 	20 	 
referenceNo 	referenceNo 	N 	50 	 
branchId 	branchId 	N 	18 	 
branchName 	branchName 	N 	500 	 
totalAmount 	totalAmount 	N 	Number 	 
Field 	Field Name 	Required 	Length 	Description 
commodityGood sId 	commodityGoodsId 	N 	18 	commodityGoodsId and 
goodsCode cannot be empty at 
the same time 
goodsCode 	goodsCode 	N 	50 	commodityGoodsId and 
goodsCode cannot be empty at 
the same time 
goodsName 	goodsName 	N 	600 	 
measureUnit 	measureUnit 	N 	3 	T115 rateUnit 
currency 	currency 	N 	3 	T115 currencyType 
quantity 	quantity 	N 	Number 	Integer digits cannot exceed 
12, decimal digits cannot exceed 8; 
unitPrice 	unitPrice 	N 	Number 	Commodity purchase price 
Integer digits cannot exceed 
12, decimal digits cannot exceed 8; 
totalAmount 	totalAmount 	N 	Number 



45. Goods Stock Adjust recods query 
Interface Name 	Goods Stock Adjust recods query 
Description 	Goods Stock Adjust recods query 
Interface Code 	T149 
Request Encrypted 	Y 	
Response Encrypted 	Y 	
Request 
Message 	{ 
 
 
} 	"referenceNo": "425502528294126235", 
"startDate": "2021-09-10", 
"endDate": "2021-09-11", 
"pageNo": "1", 
"pageSize": "10" 
Response 
Message 	{ 
 
 
 
} 	"page": { 
 "pageNo": "1", 
 "pageSize": "10", 
 "totalSize": " Total number of articles ", 
 "pageCount": "total pages" 
}, 
"records": [{ 
 "id": "208178192251887451", 
 "referenceNo": "425502528294126235", 
 "branchName": "PARAMOUR COSMETICS LIMITED", 
 "adjustDate": "2020-09-01", 
 "adjustType": "101", 
 "remarks": "Increase inventory", 
 "adjustAmount": "500.00" }] 
Flow Description 	Goods Stock Adjust recods query 
Field description 
Field 	Field Name 	Required 	Length 	Description 
referenceNo 	referenceNo 	N 	50 	 
startDate 	startDate 	N 	Date 	 
endDate 	endDate 	N 	Date 	yyyy-MM-dd 
pageNo 	current page number 	Y 	10 	yyyy-MM-dd 
pageSize 	How many records are displayed per page 	Y 	3 	Cannot be greater than the integer 100 
 
Field 	Field Name 	Required 	Length 	Description 
id 	id 	N 	18 	 
referenceNo 	referenceNo 	N 	50 	 
branchName 	branchName 	N 	500 	 
adjustDate 	adjustDate 	N 	Date 	 
adjustType 	adjustType 	N 	3 	101:Expired Goods 
102:Damaged Goods 
103:Personal Uses 
105:Raw Material(s) 
104:Others. (Please specify)  
remarks 	remarks 	N 	1024 	 
adjustAmount 	adjustAmount 	N 	Number 	Integer digits cannot exceed 12, decimal digits cannot exceed 8; 



46. Goods Stock Adjust detail query 
Interface Name 	Goods Stock Adjust detail query 
Description 	Goods Stock Adjust detail query 
Interface Code 	T160 
Request Encrypted 	Y 
Response Encrypted 	Y 	
Request 
Message 	{ 
 
} 	"id": "425502528294126235" 
Response 
Message 	{ 
 
 

} 	"goodsStockAdjust": { 
 "branchId": "2020090132456", 
 "branchName": "PARAMOUR COSMETICS LIMITED", 
 "adjustDate": "2020-09-01", 
 "adjustType": "101", 
 "remarks": "Increase inventory", 
 "adjustAmount": "69999" 
}, 
"goodsStocAdjustGoods": [{ 
 "commodityGoodsId": "287700992426868373", 
 "goodsCode": "287700992426", 
 "goodsName": "test", 
 "measureUnit": "101", 
 "unitPrice": "6999", 
 "stock": "100", 
 "adjustQuantity": "10", 
 "currentQuantity": "90", 
 "adjustAmount": "69990.00", 
 "remarks": "remarks" 
}] 
Flow Description 	Goods Stock Adjust detail query 
Field description 
	Field 	Field Name 	Required 	Length 	Description 
id 		id 	N 	50 	 
 
Field 	Field Name 	Required 	Length 	Description 
branchId 	branchId 	N 	18 	 
branchName 	branchName 	N 	500 	 
adjustDate 	adjustDate 	N 	Date 	 
adjustType 	adjustType 	N 	3 	101:Expired Goods 
102:Damaged Goods 
				103:Personal Uses 
105:Raw Material(s) 
104:Others. (Please specify)  
remarks 	remarks 	N 	1024 	 
adjustAmount 	adjustAmount 	N 	Number 	 
 
Field 	Field Name 	Required 	Length 	Description 
commodityGood sId 	commodityGoodsId 	N 	18 	commodityGoodsId and 
goodsCode cannot be empty at 
the same time 
goodsCode 	goodsCode 	N 	50 	commodityGoodsId and 
goodsCode cannot be empty at 
the same time 
goodsName 	goodsName 	N 	600 	 
measureUnit 	measureUnit 	N 	3 	T115 rateUnit 
unitPrice 	unitPrice 	N 	Number 	Commodity purchase price 
Integer digits cannot exceed 
12, decimal digits cannot exceed 8; 
stock 	stock 	N 	Number 	Integer digits cannot exceed 12, decimal digits cannot exceed 8; 
adjustQuantit y 	adjustQuantity 	N 	Number 	Integer digits cannot exceed 12, decimal digits cannot exceed 8; 
currentQuanti ty 	currentQuantity 	N 	Number 	Integer digits cannot exceed 12, decimal digits cannot exceed 8; 
adjustAmount 	adjustAmount 	N 	Number 	Integer digits cannot exceed 12, decimal digits cannot exceed 8; 
remarks 	remarks 	N 	1024 	goodsStockInItem-->remarks 
 



47. Query fuel type 
Interface Name 	Query fuel type 
Description 	Query fuel type 
Interface Code 	T162 
Request Encrypted 	N 
Response Encrypted 	Y 
Request 
Message 	NULL 
Response 
Message 	[{ 
 "fuelTypeCode": "15101502",  "parentCode": "15101500", 
 "fuelTypeName": "Kerosene", 
 "fuelTypeLevel": "3", 
 "isLeafNode": "101" 
}] 
Flow Description 	Query fuel type 
Field description 
Field 	Field Name 	Required 	Length 	Description 
fuelTypeCode 	fuelTypeCode 	Y 	18 	 
parentCode 	parentCode 	Y 	18 	 
fuelTypeName 	fuelTypeName 	Y 	200 	 
fuelTypeLevel 	fuelTypeLevel 	Y 	1 	 
isLeafNode 	isLeafNode 	Y 	3 	101:Y   
102:N 
 




48. Upload shift information 
Interface Name 	Upload shift information 
Description 	Upload shift information 
Interface Code 	T163 
Request Encrypted 	Y 
Response Encrypted 	N 
Request 
Message 	{ 
 "shiftNo": "20220101-01", 
 "startVolume": "851.91", 
	 
 
} 	"endVolume": "851.91", 
"fuelType": "Kerosene", 
"goodsId": "12344", 
"goodsCode": "Kerosene_01", 
"invoiceAmount": "221.31000000", 
"invoiceNumber": "16", 
"nozzleNo": "nozzle_01_0001", 
"pumpNo": "pump_01_0001", 
"tankNo": "tank_01_0001", 
"userName": "Kerwin", 
"userCode": "kerwin0001", 
"startTime": "2022-01-20 13:59:14", 
"endTime": "2022-01-21 13:59:14" 
Response 
Message 	NULL 
Flow Description 	Upload shift information 
Field description 
Field 	Field Name 	Required 	Length 	Description 
shiftNo 	shiftNo 	Y 	20 	 
startVolume 	startVolume 	Y 	Number 	 
endVolume 	endVolume 	Y 	Number 	 
fuelType 	fuelType 	Y 	200 	Goods Name 
goodsId 	goodsId 	Y 	18 	 
goodsCode 	goodsCode 	Y 	50 	 
invoiceAmount 	invoiceAmount 	Y 	Number 	 
invoiceNumber 	invoiceNumber 	Y 	50 	Invoice Count 
nozzleNo 	nozzleNo 	Y 	50 	 
pumpNo 	pumpNo 	Y 	50 	 
tankNo 	tankNo 	Y 	50 	 
userName 	userName 	Y 	500 	 
userCode 	userCode 	Y 	100 	User Account 
startTime 	startTime 	Y 	Date 	yyyy-MM-dd HH24:mm:ss 
endTime 	endTime 	Y 	Date 	yyyy-MM-dd HH24:mm:ss 
 



49. Upload EDC disconnection data 
Interface Name 	Upload EDC disconnection data 
Description 	Upload EDC disconnection data 
Interface Code 	T164 
Request Encrypted 	Y 
Response Encrypted 	N 
Request 
Message 	[{ 
 "deviceNumber": "208178192251887451", 
 "disconnectedType": "101", 
 "disconnectedTime": "2022-01-20 10:00:00", 
 "remarks": "Abnormal transaction" }] 
Response 
Message 	NULL 
Flow Description 	Upload EDC disconnected data 
Field description 
Field 	Field Name 	Required 	Length 	Description 
deviceNumber 	deviceNumber 	Y 	50 	 
disconnectedT ype 	disconnectedType 	Y 	3 	101: TCS disconnected with 
Controller 
102:Abnormal Transaction 
disconnectedT ime 	disconnectedTime 	Y 	Date 	yyyy-MM-dd HH24:mm:ss 
remarks 	remarks 	N 	Text 	 
 


50. Update buyer details 
Interface Name 	Update buyer details 
Description 	Update buyer details 
Interface Code 	T166 
Request Encrypted 	Y 	
Response Encrypted 	N 	
Request 
Message 	{ 
 

 
} 	"invoiceNo": "321000229045", 
"buyerTin": "201905081705", 
"buyerNinBrn": "201905081705", 
"buyerPassportNum": "201905081705", 
"buyerLegalName": "zhangsan", 
"buyerBusinessName": "lisi", 
"buyerAddress": "beijin", 
"buyerEmailAddress": "123456@163.com", 
"buyerMobilePhone": "15501234567", 
"buyerLinePhone": "010-6689666", 
"buyerPlaceOfBusi": "beijin", 
"buyerType": "1", 
"buyerCitizenship": "1", 
"buyerSector": "1", 
"mvrn": "1", 
"createDateStr": "2022-02-23 14:21:00" 
Response 
Message 	NULL 
Flow Description 	Update buyer details 
Field description 
Field 	Field Name 	Required 	Length 	Description 
invoiceNo 	invoiceNo 	Y 	20 	 
buyerTin 	Buyer TIN 	N 	20 	If 'buyerType' is '0', buyerTin cannot be empty! 
buyerNinBRn 	Buyer NIN 	N 	100 	 
buyerPassport Num 	Passport number 	N 	20 	 
buyerLegalNam e 	legal name 	N 	256 	 
buyerBusiness Name 	business name 	N 	 256 	 
buyerAddress 	buyeraddress 	N 	500 	 
buyerEmailAdd ress 	buyeremail 	N 	50 	Mailbox format 
buyerMobilePh one 	mobile phone 	N 	30 	 
buyerLinePhon e 	line phone 	N 	30 	 
buyerPlaceOfB usi 	place of business 	N 	500 	 
buyerType 	Buyer Type 	Y 	1 	0	: B2B  
1	: B2C 
2	: Foreigner 
buyerCitizens hip 	Buyer Citizenship 	N 	128 	 
buyerSector 	Buyer Sector 	N 	200 	 
buyerReferenc eNo 	Buyer ReferenceNo 	N 	50 	EFD and CS do not need to be transmitted, and the external interface is used. 
mvrn 	mvrn 	N 	32 	 
createDateStr 	createDateStr 	N 	Date 	yyyy-MM-dd HH24:mm:ss 
 


51. EDC Invoice /Receipt Inquiry 
Interface Name 	EDC Invoice /Receipt inquiry 
Description 	EDC Invoice /Receipt inquiry 
Interface Code 	T167 
Request Encrypted 	Y 	
Response Encrypted 	Y 	
Request 
Message 	{ 
 
 	"fuelType": "Naphtha", 
"invoiceNo": "321000229045", 
"buyerLegalName": "lisi", 
"startDate": "2021-12-28", 
"endDate": "2021-12-28", 
"pageNo": "1", 
"pageSize": "10", 
"queryType": "1", 
"branchId": "2020090132456" 

	} 	
Response 
Message 	{ 
 
 
 
 
} 	"page": { 
 "pageNo": "1", 
 "pageSize": "10", 
 "totalSize": " Total number of articles ", 
 "pageCount": "total pages" 
}, 
"records": [{ 
 "id": "159078217852531032", 
 "invoiceNo": "00000000001", 
 "oriInvoiceId": "00000000003", 
 "oriInvoiceNo": "00000000002", 
 "issuedDate": "15/06/2019 02:00:00", 
 "buyerTin": "7777777777", 
 "buyerLegalName": "test", 
 "buyerNinBrn": "00000000001", 
 "currency": "UGX", 
 "grossAmount ": "2000.00", 
 "taxAmount ": "2000.00", 
 "dataSource": "101", 
 "isInvalid": "1", 
 "isRefund": "1", 
 "invoiceType": "1", 
 "invoiceKind": "1", 
 "invoiceIndustryCode": "102", 
 "branchName": "Mr. RAJIV DINESH GANDHI", 
 "deviceNo": "121241304906446273", 
 "uploadingTime": "15/06/2019 02:00:00", 
 "referenceNo": "00000000012", 
 "operator": "administrator", 
 "userName": "Mr. ANDREW KIIZA", 
 "pumpNo": "000001", 
 "nozzleNo": "000002", 
 "fuelType": "Mr. ANDREW KIIZA", 
 "updateTimes": "1" 
}] 
Flow Description 		EDC Invoice /Receipt query 
Field description 
Field 	Field Name 	Required 	Length 	Description 
fuelType 	fuelType 	N 	200 	 
invoiceNo 	invoiceNo 	N 	20 	 
buyerLegalNam e 	buyerLegalName 	N 	256 	 
startDate 	start date 	N 	Date 	yyyy-MM-dd HH24:mm:ss 
endDate 	End date 	N 	Date 	yyyy-MM-dd HH24:mm:ss 
pageNo 	current page number 	Y 	10 	 
pageSize 	How many records are displayed per page 	Y 	3 	Cannot be greater than the integer 100 
queryType 	queryType 	Y 	1 	1:Query all gas station invoices that have not been modified  2:Query the gas station invoice successfully issued by the modified contact 
 
3:Query all 
branchId 	branchId 	N 	18 	 
 
Field 	Field Name 	Required 	Length 	Description 
id 	Invoice ID 	Y 	32 	 
invoiceNo 	Invoice number 	Y 	30 	 
oriInvoiceId 	Original invoice 
ID 	N 	32 	 
oriInvoiceNo 	Original invoice number 	N 	30 	 
issuedDate 	Billing date 	Y 	Date 	 
businessName 	business name 	Y 	256 	 
buyerTin 	Buyer TIN 	 	10-20 	 
buyerLegalNam e 	Buyer name 	Y 	256 	 
taxAmount  	taxAmount 	Y 	Number 	 
buyerNinBrn 	Buyer NinBrn 	Y 	100 	 
currency 	Currency 	Y 	10 	 

grossAmount 	total amount 	Y 	Number 	 
dataSource 	Data Sources 	Y 	3 	101:EFD 
102:Windows Client APP 
103:WebService API 
104:Mis 
105:Webportal 
106:Offline Mode Enabler  Corresponding dictionary table invoiceApplySource 
invoiceType 	invoice type 	Y 	1 	1:Invoice/Receipt 
2:Credit Note With Original 
FDN 
3:Credit Note Without 
Original FDN 
4:Debit Note 
 Corresponding dictionary table invoiceType 
invoiceKind 	invoice kind 	Y 	1 	1 :Invoice 
2: Receipt 
isInvalid 	Obsolete sign 	Y 	1 	Obsolete sign 1：obsolete 0：
Not obsolete  Note: Obsolete only for positive and supplementary tickets 
isRefund 	Is it open to a credit 
note/Debit Note 	N 	1 	Whether it is opened for a ticket / Debit Note: 0 - not issued a negative ticket / 
Debit 1- is issued Credit 2- is issued Debit 
pageNo 	current page number 	Y 	10 	 
pageSize 	How many records are displayed per page 	Y 	3 	 
totalSize 	Total number of articles 	Y 	10 	 
pageCount 	total pages 	Y 	10 	 
invoiceIndust ryCode 	invoiceIndustryC ode 	N 	3 	101:General Industry 
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
branchName 	branchName 		N 	500 	 
deviceNo 	deviceNo 		Y 	50 	 
uploadingTime 	uploadingTime 		Y 	Date 	 
referenceNo 	referenceNo 		N 	50 	Seller's Reference No. 
operator 	operator 		N 	100 	 
userName 	userName 		N 	500 	 
pumpNo 	pumpNo 	N 		50 	 
nozzleNo 	nozzleNo 	N 		50 	 
fuelType 	fuelType 	N 		200 	 
 


52. Query fuel pump version 
Interface Name 	Query fuel pump version 
Description 	Query fuel pump version 
Interface Code 	T168 
Request Encrypted 	N 
Response Encrypted 	Y 
Request 
Message 	NULL 
Response 
Message 	{ 
 "fuelPumpList": [{ 
  "id": "208178192251887451", 
  "branchId": "425502528294126235", 
  "pumpNo": "1223-0011", 
  "pumpVersion": "1641541077436" 
 }], 
 "fuelDefaultBuyerList": [{ 
  "id": "208178192251887451", 
  "taxpayerId": "208178192251887451", 
	  "branchId": "425502528294126235", 
  "legalName": "1223-0011" 
 }] 
} 
Flow Description 	Query fuel pump version 
Field description 
Field 	Field Name 	Required 	Length 	Description 
id 	id 	N 	18 	 
branchId 	branchId 	N 	18 	 
pumpNo 	pumpNo 	N 	50 	 
pumpVersion 	pumpVersion 	N 	15 	 
taxpayerId 	taxpayerId 	N 	18 	 
legalName 	legalName 	N 	200 	 
 


53. Query fuel pump、fuel nozzle、fuel tank according to pump no 
Interface Name 	Query fuel pump、fuel nozzle、fuel tank according to pump no 
Description 	Query fuel pump、fuel nozzle、fuel tank according to pump no 
Interface Code 	T169 
Request Encrypted 	Y 
Response Encrypted 	Y 
Request Message 	{ 
 "id": "689769596689001259" } 
Response Message 	{ 
 "fuelPump": { 
  "id": "208178192251887451", 
  "branchId": "425502528294126235", 
  "pumpNo": "1223-0011", 
  "enableStatusCode": "101", 
  "pumpSerialNumber": "1223-002", 
  "manufacturerName": "M", 
  "manufactureDateStr": "2020-09-01", 

	  "acquisitionEquipmentId": "689769596689001232", 
  "acquisitionEquipmentNo": "1223-0011", 
  "pumpVersion": "1641541077436" 
 }, 
 "fuelNozzleList": [{ 
  "id": "208178192251887451", 
  "branchId": "425502528294126235", 
  "nozzleNo": "N1225-0011", 
  "enableStatusCode": "101", 
  "nozzleSerialNumber": "N1225-0011",   "manufacturerName": "M", 
  "manufactureDateStr": "2020-09-01", 
  "tankId": "568654903587001036", 
  "tankNo": "568654903587001036", 
  "pumpId": "689769596689001111", 
  "pumpNo": "689769596689001111", 
  "acquisitionEquipmentId": "423716178935500123", 
  "acquisitionEquipmentNo": "423716178935500123", 
  "aeChannelNo": "NAE1222-001", 
  "lockedStatusCode": "101" 
 }], 
 "fuelTankList": [{ 
  "id": "208178192251887451", 
  "branchId": "425502528294126235", 
  "tankNo": "1223-0011", 
  "enableStatusCode": "101", 
  "tankSerialNumber": "1223-0011", 
  "manufacturerName": "M", 
  "manufactureDateStr": "2020-09-01", 
  "probeNo": "1223-0011", 
  "levelGaugId": "425502528294126235", 
  "levelGaugNo": "1223-0011", 
  "commodityGoodsId": "178619068278610463" 
  "presentPrice": "9.23", 
  "tankVersion": "20220323145000" 
 }], 
 "fuelEdcDeviceList": [{ 
  "id": "208178192251887451", 
  "parentId": "425502528294126235", 
  "branchId": "425502528294126235", 
  "edcDeviceTypeCode": "101", 
  "edcDsn": "1223-0011", 
	 
 
 
 
} 	 "manufacturerName": "101", 
 "manufactureDateStr": "2020-09-01", 
 "enableStatusCode": "101" }] 
Flow Description 		Query fuel pump、fuel nozzle、fuel tank according to pump no 
Field description 
	Field 	Field Name 	Required 	Length 	Description 
id 		id 	Y 	18 	 
 
Field 	Field Name 	Required 	Length 	Description 
id 	id 	N 	18 	 
branchId 	branchId 	N 	18 	 
pumpNo 	pumpNo 	N 	50 	 
enableStatusC ode 	enableStatusCode 	N 	3 	101:enable 
102:disable 
pumpSerialNum ber 	pumpSerialNumber 	N 	50 	 
manufacturerN ame 	manufacturerName 	N 	200 	 
manufactureDa teStr 	manufactureDateS tr 	N 	Date 	 
acquisitionEq uipmentId 	acquisitionEquip mentId 	N 	18 	 
acquisitionEq uipmentNo 	acquisitionEquip mentNo 	N 	50 	 
pumpVersion 	pumpVersion 	N 	15 	 
 
Field 	Field Name 	Required 	Length 	Description 
id 	id 	N 	18 	 
branchId 	branchId 	N 	18 	 
nozzleNo 	nozzleNo 	N 	50 	 
enableStatusC ode 	enableStatusCode 	N 	3 	101:enable 
102:disable 
nozzleSerialN umber 	nozzleSerialNumb er 	N 	50 	 
manufacturerN ame 	manufacturerName 	N 	200 	 
manufactureDa teStr 	manufactureDateS tr 	N 	Date 	 
tankId 	tankId 	N 	18 	 
tankNo 	tankNo 	N 	50 	 
pumpId 	pumpId 	N 	18 	 
pumpNo 	pumpNo 	N 	50 	 
acquisitionEq uipmentId 	acquisitionEquip mentId 	N 	18 	 
acquisitionEq uipmentNo 	acquisitionEquip mentNo 	N 	50 	 
aeChannelNo 	aeChannelNo 	N 	50 	 
lockedStatusC ode 	lockedStatusCode 	N 	3 	101:YES 
102:NO 
 
Field 	Field Name 	Required 	Length 	Description 
id 	id 	N 	18 	 
branchId 	branchId 	N 	18 	 
tankNo 	tankNo 	N 	50 	 
enableStatusC ode 	enableStatusCode 	N 	3 	101:enable 
102:disable 
tankSerialNum ber 	tankSerialNumber 	N 	50 	 
manufacturerN ame 	manufacturerName 	N 	200 	 
manufactureDa teStr 	manufactureDateS tr 	N 	Date 	 
probeNo 	probeNo 	N 	50 	 
levelGaugId 	levelGaugId 	N 	18 	 
levelGaugNo 	levelGaugNo 	N 	50 	 
commodityGood sId 	commodityGoodsId 	N 	18 	 
presentPrice 	presentPrice 	N 	18 	 
tankVersion 	tankVersion 	N 	15 	 
 
Field 	Field Name 	Required 	Length 	Description 
id 	id 	N 	18 	 
parentId 	parentId 	N 	18 	 
branchId 	branchId 	N 	18 	 
edcDeviceType	edcDeviceTypeCod	N 	3 	101: Controller 
Code 	e 			102: Acquisition Equipment 
103: Level Gauge 
edcDsn 	edcDsn 	N 	50 	 
manufacturerN ame 	manufacturerName 	N 	200 	 
manufactureDa teStr 	manufactureDateS tr 	N 	Date 	 
enableStatusC ode 	enableStatusCode 	N 	3 	101:enable 
102:disable 
 



54. Query efd location 
Interface Name 	Query efd location 
Description 	Query efd location 
Interface Code 	T170 
Request Encrypted 	Y 
Response Encrypted 	Y 
Request Message 	{ 
 "deviceNumber": "00031000092", 
 "startDate": "2019-06-14", 
 "endDate": "2019-06-15" } 
Response 
Message 	[{ 
 "deviceNumber": "208178192251887451", 
 "longitude": "425502528294126235", 
 "latitude": "1223-0011", 
 "recordDate": "101" 
}] 
Flow Description 	Query efd location, only return latest X records, X is a configurable system parameter(LocationCountLimit), default is 10. 
Field description 
Field 	Field Name 	Required 	Length 	Description 
deviceNumber 	deviceNumber 	Y 	20 	 
startDate 	startDate 	N 	Date 	yyyy-MM-dd 
endDate 	endDate 	N 	Date 	yyyy-MM-dd 
 
Field 	Field Name 	Required 	Length 	Description 
deviceNumber 	deviceNumber 	N 	20 	 
longitude 	longitude 	N 	60 	 
latitude 	latitude 	N 	60 	 
recordDate 	recordDate 	N 	Date 	 
 




55. Query EDC UoM exchange rate 
Interface Name 	Query EDC UoM exchange rate 
Description 	Query EDC UoM exchange rate 
Interface Code 	T171 
Request Encrypted 	N 
Response Encrypted 	Y 
Request Message 	NULL 
Response Message 	[{ 
 "unitOfMeasure": "102", 
 "exchangeRate": "1" 
}] 
Flow Description 	Query EDC UoM exchange rate 
Field description 
Field 	Field Name 	Required 	Length 	Description 
unitOfMeasure 	unitOfMeasure 	Y 	3 	 
exchangeRate 	exchangeRate 	Y 	Number 	 
 



56. Fuel nozzle status upload 
Interface Name 	Fuel nozzle status upload 
Description 	Fuel nozzle status upload 
Interface Code 	T172 
Request Encrypted 	Y 
Response Encrypted 	N 
Request 
Message 	{ 
 "nozzleId": "208178192251887451", 
 "nozzleNo": "N1225-0011", 
 "status": "1" 
} 
Response 
Message 	NULL 
Flow Description 	Fuel nozzle status upload 
Field description 
Field 	Field Name 	Required 	Length 	Description 
nozzleId 	nozzleId 	Y 	18 	 
nozzleNo 	nozzleNo 	Y 	50 	 
status 	status 	Y 	1 	1:Available 
2:Card Plug-in 3:Nozzle Lift 4:Fueling 
5:Nozzle Hang 
6:Settling 
7:Nozzle Locked 
10:Offline 
 



57. Query Edc device Version 
Interface Name 	Query Edc device Version 
Description 	Query Edc device Version 
Interface Code 	T173 
Request Encrypted 	N 
Response Encrypted 	Y 
Request 
Message 	NULL 
Response 
Message 	[{ 
 "id": "208178192251887451", 
 "manufacturerCode": "101", 
 "manufacturerName": "101", 
 "deviceTypeCode": "101", 
 "versionNo": "1" 
}] 
Flow Description 	Query Edc device Version 
Field description 
Field 	Field Name 	Required 	Length 	Description 
id 	id 	Y 	18 	 
manufacturerC ode 	manufacturerCode 	Y 	3 	 
manufacturerN ame 	manufacturerName 	Y 	200 	 
deviceTypeCod e 	deviceTypeCode 	Y 	3 	101:Controller 
102:Acquisition Equipment 
103:Level Gauge 
versionNo 	versionNo 	Y 	20 	 
 



58. Account Creation for USSD taxpayer 
Interface Name 	Account Creation for USSD taxpayer 
Description 	Account Creation for USSD taxpayer 
Interface Code 	T175 
Request Encrypted 	Y 
Response Encrypted 	N 
Request 
Message 	{ 
 "tin": "1009837013", 
 "mobileNumber": "155012345678" } 
Response 
Message 	NULL 
Flow Description 	Account Creation for USSD taxpayer 
Field description 
Field 	Field Name 	Required 	Length 	Description 
tin 	Tin 	Y 	10-20 	 
mobileNumber 	mobileNumber 	Y 	30 	 
 




59. Upload device issuing status 
Interface Name 	Upload device issuing status 
Description 	Upload device issuing status 
Interface Code 	T176 
Request Encrypted 	N 
Response Encrypted 	N 
Request 
Message 	{ 
 "deviceNo": "00022080670", 
 "deviceIssuingStatus": "101" } 
Response 
Message 	NULL 
Flow Description 	Upload device issuing status 
Field description 
Field 	Field Name 	Required 	Length 	Description 
deviceNo 	deviceNo 	Y 	20 	 
deviceIssuing
Status 	deviceIssuingSta tus 	Y 	3 	101:Ready 
102:Issuing 
103:Printing 
 



 
60. Negative stock configuration inquiry 
Interface Name 	Negative stock configuration inquiry 
Description 	Negative stock configuration inquiry 
Interface Code 	T177 
Request Encrypted 	N 
Response Encrypted 	N 
Request 
Message 	NULL 
Response 
Message 	{ 
 
 
 
} 	"goodsStockLimit": { 
 "id": "121242512738902997", 
 "periodFrom": "2022-08-01", 
 "periodTo": "2022-08-30", 
 "allNegativeCode": "101", 
 "statusCode": "101" 
}, 
"goodsStockLimitCategoryList": [{ 
 "id": "208178192251887451", 
 "goodsStockLimitId": "425502528294126235", 
 "commodityCategoryCode": "10101501", 
 "isSelectAll": "101" 
}] 
Flow Description 	Negative stock configuration inquiry 
Field description 
Field 	Field Name 	Required 	Length 	Description 
id 	id 	Y 	18 	 
periodFrom 	periodFromDate 	Y 	Date 	yyyy-MM-dd 
periodTo 	periodToDate 	Y 	Date 	yyyy-MM-dd 
allNegativeCo	allNegativeCode 	Y 	3 	101:Y 
de 				102:N  allNegativeCode = 101 goodsStockLimitDetails is null  allNegativeCode = 102 goodsStockLimitDetails is not null 
statusCode 	statusCode 	Y 	3 	101:Enable 
102:Disable 
 
Field 	Field Name 	Required 	Length 		Description 
id 	id 	Y 	18 		 
goodsStockLim itId 	goodsStockLimitI d 	Y 	18 	 	
commodityCate goryCode 	commodityCategor yCode 	Y 	18 	 	
isSelectAll 	isSelectAll 	Y 	3 	101:Y 
102:N 	
 


61. EFD Transfer 
Interface Name 	EFD Transfer 
Description 	EFD Transfer 
Interface Code 	T178 
Request Encrypted 	Y 
Response Encrypted 	N 
Request 
Message 	{ 
 "destinationBranchId": "214342953041962148", 
 "remarks": "test" 
} 
Response 
Message 	NULL 
Flow Description 	EFD Transfer 
Field description 
Field 	Field Name 	Required 	Length 	Description 
destinationBr anchId 	destinationBranc hId 	Y 	18 	 
remarks 	remarks 	N 	1024 	 
 


62. Query agent relation information 
Interface Name 	Query agent relation information 
Description 	Query agent relation information 
Interface Code 	T179 
Request Encrypted 	Y 	
Response Encrypted 	Y 	
Request 
Message 	{ 
 
} 	"tin": "1009837013" 
Response 
Message 	{ 
 
 
 
} 	"agentTaxpayerList": [{ 
 "taxpayerId": "503183431957111174", 
 "tin": "1009837013", 
 "ninBrn": "0001", 
 "legalName": "101", 
 "businessName": "13.99", 
 "contactNumber": "101", 
 "contactEmail": "12", 
 "address": "12", 
 "taxpayerType": "101", 
 "taxpayerStatus": "101", 
 "branchId ": "210059212594887180 ", 
 "branchCode": "210059212594887178", 
 "branchName": "zhangsan", 
 "branchStatus": "101" 
}] 
Flow Description 	Query agent relation information 
Field description 
	Field 	Field Name 	Required 	Length 	Description 
tin 		tin 	N 	20 	Principal agent TIN 
 
Field 	Field Name 	Required 	Length 	Description 
taxpayerId 	taxpayerId 	Y 	18 	 
tin 	tin 	Y 	20 	 
ninBrn 	ninBrn 	N 	100 	 
legalName 	legalName 	Y 	256 	 
businessName 	businessName 	Y 	256 	 
contactNumber 	contactNumber 	Y 	50 	 
contactEmail 	contactEmail 	Y 	50 	 
address 	address 	Y 	500 	 
taxpayerType 	taxpayerType 	Y 	3 	201:Individual 202:Non-
Individual 
taxpayerStatu s 	taxpayerStatus 	Y 	3 	Corresponding dictionary taxpayerStatus 
 
101: Registered 
102: Deactivated 
103: Suspended 
104: Deregistered 
branchId  	branchId  	Y 	18 	 
branchCode 	branchCode 	Y 	50 	 
branchName 	branchName 	Y 	500 	 
branchStatus 	branchStatus 	Y 	3 	Corresponding dictionary branchStatus 
 
101: Registered 
102: Deactivated 
103: Suspended 
104: Deregistered 
63. Query Principal agent TIN information 
Interface Name 	Query Principal agent TIN information 
Description 	Query Principal agent TIN information 
Interface Code 	T180 
Request Encrypted 	Y 	
Response Encrypted 	Y 	
Request 
Message 	{ 
 
 
} 	"tin": "1009837013", 
"branchId": "210059212594887180 " 
Response 
Message 	{ 
 
 
} 	"taxType": [{ 
 "taxTypeName": "Value Added Tax",  "taxTypeCode": "301", 
 "registrationDate": "04/09/2019", 
 "cancellationDate": "12/09/2019" 
}], 
"issueTaxTypeRestrictions": "1", 
"sellersLogo": "1", 
"isAllowBackDate": "0", 
"isDutyFreeTaxpayer": "0", 
"periodDate": "7", 
"isAllowIssueInvoice": "0", 
"isAllowOutOfScopeVAT": "0" 
Flow Description 		Query Principal agent TIN information 
Field description 
Field 	Field Name 	Required 	Length 	Description 
tin 	tin 	Y 	20 	 
branchId 	branchId 	Y 	18 	 
 
Field 	Field Name 	Required 	Length 	Description 
taxTypeName 	Tax type name 	Y 	200 	 
taxTypeCode 	Tax type 	Y 	50 	Corresponding dictionary taxType 
registrationD ate 	effective date 	Y 	Date 	 
cancellationD ate 	Obsolete date 	Y 	Date 	 
	 		
issueTaxTypeR estrictions 	issueTaxTypeRest rictions 	Y 	1 	0:No 1:Yes 
sellersLogo 	Sellers Logo 	Y 	Unlimit ed 	Base64 content 
isAllowBackDa te 	isAllowBackDate 	Y 	1 	0 - no past time allowed, 1 - past time allowed. The default value is 0. When the taxpayer is in the list 
maintained by the office and is valid, the value is 1 
isDutyFreeTax payer 	isDutyFreeTaxpay er 	Y 	1 	If the taxpayer is in the list and valid, and the taxpayer has no consumption tax, the value is 1, otherwise it is 0 
periodDate 	periodDate 	Y 	Number 	From the system parameter, if not, the default value is 7 
isAllowIssueI nvoice 	isAllowIssueInvo ice 	Y 	1 	0:No 1:Yes 
isAllowOutOfS copeVAT 	isAllowOutOfScop eVAT 	Y 	1 	0:No 1:Yes 
64. Upload Frequent Contacts 
Interface Name 	Upload Frequent Contacts 
Description 	Upload Frequent Contacts 
Interface Code 	T181 
Request Encrypted 	Y 
Response Encrypted 	N 
Request 
Message 	{ 
 "operationType": "101", 
	 
 
} 	"id": "613714332817808478", 
"buyerType": "0", 
"buyerTin": "1009837013", 
"buyerNinBrn": "09656200018719", 
"buyerLegalName": "Mr. PETER KADDU", 
"buyerBusinessName": "ZAYN KIDS ORNAMENT", 
"buyerEmail": "123456@163.com", 
"buyerLinePhone": "00256779523165", 
"buyerAddress": "KAZAHI KANUNGU KINKIZI WEST KAYONZA", 
"buyerCitizenship": "UG-Uganda", 
"buyerPassportNum": "1234567890" 
Response 
Message 	NULL 
Flow Description 	Upload Frequent Contacts 
Field description 
Field 	Field Name 	Required 	Length 	Description 
operationType 	operationType 	Y 	3 	101: Add Frequent Contacts 
102: Modify Frequent Contacts 
103: Delete Frequent Contacts 
id 	id 	N 	18 	 
buyerType 	buyerType 	Y 	1 	0	: B2B  
1	: B2C 
2	: Foreigner 
3	: B2G 
buyerTin 	buyerTin 	N 	20 	 
buyerNinBrn 	buyerNinBrn 	N 	100 	 
buyerLegalNam e 	buyerLegalName 	N 	256 	 
buyerBusiness Name 	buyerBusinessNam e 	N 	256 	 
buyerEmail 	buyerEmail 	N 	50 	 
buyerLinePhon e 	buyerLinePhone 	N 	30 	 
buyerAddress 	buyerAddress 	N 	500 	 
buyerCitizens hip 	buyerCitizenship 	N 	128 	 
buyerPassport Num 	buyerPassportNum 	N 	30 	 
 


65. Get Frequent Contacts 
Interface Name 	Get Frequent Contacts 
Description 	Get Frequent Contacts 
Interface Code 	T182 
Request Encrypted 	Y 
Response Encrypted 	Y 
Request 
Message 	{ 
 "buyerTin": "1009837013", 
 "buyerLegalName": "Mr. PETER KADDU" } 
Response 
Message 	[{ 
 "id": "613714332817808478", 
 "buyerType": "0", 
 "buyerTin": "1009837013", 
 "buyerNinBrn": "09656200018719", 
 "buyerLegalName": "Mr. PETER KADDU", 
 "buyerBusinessName": "ZAYN KIDS ORNAMENT", 
 "buyerEmail": "123456@163.com", 
 "buyerLinePhone": "00256779523165", 
 "buyerAddress": "KAZAHI KANUNGU KINKIZI WEST KAYONZA", 
 "buyerCitizenship": "UG-Uganda", 
 "buyerPassportNum": "1234567890" }] 
Flow Description 	Get Frequent Contacts 
Field description 
Field 	Field Name 	Required 	Length 	Description 
buyerTin 	buyerTin 	N 	20 	 
buyerLegalNam e 	buyerLegalName 	N 	256 	 
 
 

Field 	Field Name 	Required 	Length 	Description 
id 	id 	Y 	18 	 
buyerType 	buyerType 	Y 	1 	0	: B2B  
1	: B2C 
2	: Foreigner 
3	: B2G 
buyerTin 	buyerTin 	N 	20 	 
buyerNinBrn 	buyerNinBrn 	N 	100 	 
buyerLegalNam e 	buyerLegalName 	N 	256 	 
buyerBusiness Name 	buyerBusinessNam e 	N 	256 	 
buyerEmail 	buyerEmail 	N 	50 	 
buyerLinePhon e 	buyerLinePhone 	N 	30 	 
buyerAddress 	buyerAddress 	N 	500 	 
buyerCitizens hip 	buyerCitizenship 	N 	128 	 
buyerPassport Num 	buyerPassportNum 	N 	30 	 
 


66. Goods Stock Transfer records query 
Interface Name 	Goods Stock Transfer records query 
Description 	Goods Stock Transfer records query 
Interface Code 	T183 
Request Encrypted 	Y 
Response Encrypted 	Y 
Request 
Message 	{ 
 "referenceNo": "425502528294126235", 
 "sourceBranchId": "206637525568955296", 
 "destinationBranchId": "206637528324276772", 
 "startDate": "2021-09-10", 
 "endDate": "2021-09-11", 
 "pageNo": "1", 
	 
} 	"pageSize": "10" 
Response 
Message 	{ 
 
 
} 	"page": { 
 "pageNo": "1", 
 "pageSize": "10", 
 "totalSize": " Total number of articles ", 
 "pageCount": "total pages" 
}, 
"records": [{ 
 "id": "208178192251887451", 
 "referenceNo": "23PL030000144", 
 "sourceBranchName": "MASSI SALON", 
 "destinationBranchName": "SJZ Branch", 
 "transferAmount": "20240.11", 
 "transferDate": "11/04/2022" }] 
Flow Description 	Goods Stock Transfer records query 
Field description 
Field 	Field Name 	Required 	Length 	Description 
referenceNo 	referenceNo 	N 	50 	 
sourceBranchN ame 	sourceBranchName 	N 	500 	 
destinationBr anchName 	destinationBranc hName 	N 	500 	 
startDate 	startDate 	N 	Date 	 
endDate 	endDate 	N 	Date 	yyyy-MM-dd 
pageNo 	current page number 	Y 	10 	yyyy-MM-dd 
pageSize 	How many records are displayed per page 	Y 	3 	Cannot be greater than the integer 100 
 


Field 	Field Name 	Required 	Length 	Description 
id 	id 	N 	18 	 
referenceNo 	referenceNo 	N 	50 	 
sourceBranchI d 	sourceBranchId 	N 	18 	 
destinationBr anchId 	destinationBranc hId 	N 	18 	 
transferAmoun t 	transferAmount 	N 	Number 	Integer digits cannot exceed 12, decimal digits cannot exceed 8; 
transferDate 	transferDate 	N 	Date 	 
67. Goods Stock Transfer detail query 
Interface Name 	Goods Stock Transfer detail query 
Description 	Goods Stock Transfer detail query 
Interface Code 	T184 
Request Encrypted 	Y 	
Response Encrypted 	Y 	
Request 
Message 	{ 
 
} 	"id": "425502528294126235" 
Response 
Message 	{ 
 
 
 
 	"goodsStockTransfer": { 
 "sourceBranchId": "206637525568955296", 
 "destinationBranchId": "206637528324276772", 
 "transferDate": "11/04/2022", 
 "transferTypeCode": "101", 
 "remarks": "Others" 
}, 
"goodsStockTransferItem": [{ 
 "commodityGoodsId": "287700992426868373", 
 "goodsCode": "287700992426", 
 "goodsName": "test", 
 "measureUnit": "101", 
 "currency": "101", 
 "unitPrice": "100", 
 "bookQuantity": "100", 
 "transferQuantity": "2", 
 "transferAmount": "200", 
 "currentQuantity": "98", 
	  "remarks": "remarks" 
 }] 
} 
Flow Description 	Goods Stock Transfer detail query 
Field description 
	Field 	Field Name 	Required 	Length 	Description 
id 		id 	N 	18 	 
 
Field 	Field Name 	Required 	Length 	Description 
sourceBranchI d 	sourceBranchId 	N 	18 	 
destinationBr anchId 	destinationBranc hId 	N 	18 	 
transferDate 	transferDate 	N 	Date 	 
transferTypeC ode 	transferTypeCode 	N 	3 	101:Out of Stock Adjust 
102:Error Adjust  
103:Others (Please Specify) 
 transferTypeCode Multiple are separated by commas, 
Eg: transferTypeCode= 
'101,102' 
remarks 	remarks 	N 	1024 	 
 
Field 	Field Name 	Required 	Length 	Description 
commodityGood sId 	commodityGoodsId 	N 	18 	 
goodsCode 	goodsCode 	N 	50 	 
goodsName 	goodsName 	N 	600 	 
 	 	 	 	 
measureUnit 	measureUnit 	N 	3 	T115 rateUnit 
currency 	currency 	N 	3 	T115 currencyType 
unitPrice 	unitPrice 	N 	Number 	Commodity purchase price 
Integer digits cannot exceed 12, decimal digits cannot exceed 8; 
bookQuantity 	bookQuantity 	N 	Number 	Integer digits cannot exceed 
				12, decimal digits cannot exceed 8; 
transferQuant ity 	transferQuantity 	N 	Number 	Integer digits cannot exceed 12, decimal digits cannot exceed 8; 
transferAmoun t 	transferAmount 	N 	Number 	Integer digits cannot exceed 12, decimal digits cannot exceed 8; 
currentQuanti ty 	currentQuantity 	N 	Number 	Integer digits cannot exceed 12, decimal digits cannot exceed 8; 
remarks 	remarks 	N 	1024 	goodsStockTransferItem-
->remarks 
 


68. Query HS Code List 
Interface Name 	Query HS Code List 
Description 	Query HS Code List 
Interface Code 	T185 
Request Encrypted 	N 
Response Encrypted 	N 
Request 
Message 	Null 
Response 
Message 	[{ 
 "hsCode": "96151100", 
 "description": "0", 
 "isLeaf": "1", 
 "parentClass": "246015909942241903" }] 
Flow Description 	Query HS Code List 
Field description 
Field 	Field Name 	Required 	Length 	Description 
hsCode 	hsCode 	Y 	 	 
description 	description 	Y 	 	 
isLeaf 	isLeaf 	Y 	 	0 :yes 1:no 
parentClass 	parentClass 	Y 	




69. Invoice Remain Details 
Interface 
Name 	Invoice Remain details 
Description 	Invoice details are queried according to Invoice number. 
Interface 
Code 	T186 
Request Encrypted 	Y 	
Response Encrypted 	Y 	
Request 
Message 	{ 
 
} 	"invoiceNo": "159078217852531032" 
Response 
Message 	{ 
 
 
 
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
 "branchName": "KATUSIIME EVEALYNE SPARE PARTS", 
 "branchCode": "00" 
}, 
"basicInformation": { 
 "invoiceId": "1000002", 
 "invoiceNo": "00000000001", 
 "oriInvoiceNo": "00000000002", 
 "antifakeCode": "201905081711", 

	  "deviceNo": "201905081234", 
  "issuedDate": "08/05/2019 17:13:12", 
  "oriIssuedDate": "08/05/2019 17:13:12", 
  "oriGrossAmount": "9247", 
  "operator": "aisino", 
  "currency": "UGX", 
  "oriInvoiceId": "1", 
  "invoiceType": "1", 
  "invoiceKind": "1", 
  "dataSource": "101", 
  "isInvalid": "1",, 
  "isRefund": "1", 
  "invoiceIndustryCode": "102", 
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
  "buyerReferenceNo": "00000000001", 
  "deliveryTermsCode": "CFR", 
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
  "remainQty": "2", 
  "unitOfMeasure": "103", 
  "unitPrice": "150.00", 
  "total": "1", 
  "remainAmount": "1", 
  "taxRate": "0.18", 
  "tax": "12.88", 
  "discountTotal": "18.00", 
  "discountTaxRate": "0.18", 
  "orderNumber": "1", 
  "discountFlag": "1", 
  "deemedFlag": "1", 
  "exciseFlag": "2", 
  "categoryId": "5648", 
  "categoryName": "Test", 
  "goodsCategoryId": "5673", 
  "goodsCategoryName": "Test", 
  "exciseRate": "0.12",   "exciseRule": "1", 
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
  "totalWeight": "11", 
  "hsCode": "860210", 
  "hsName": "Diesel-electric locomotives", 
  "pieceQty": "20", 
  "pieceMeasureUnit": "101" 
 }], 
 "taxDetails": [{ 
  "taxCategory": "'Standard", 
  "netAmount": "3813.55", 

	  "taxRate": "0.18", 
  "taxAmount": "686.45", 
  "grossAmount": "4500.00", 
  "exciseUnit": "101", 
  "exciseCurrency": "UGX", 
  "taxRateName": "123", 
  "taxCategoryCode": "01" 
 }, { 
  "taxCategory": "''Excise Duty", 
  "netAmount": "1818.18", 
  "taxRate": "0.1", 
  "taxAmount": "181.82", 
  "grossAmount ": "2000.00", 
  "exciseUnit": "101", 
  "exciseCurrency": "UGX", 
  "taxRateName": "123", 
  "taxCategoryCode": "05" 
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
"custom": { 
  "sadNumber": "8379", 

	  "office": "Busia", 
  "cif": "cif", 
  "wareHouseNumber": "5", 
  "wareHouseName": " Busia ", 
  "destinationCountry": " China ", 
  "originCountry": " China", 
  "importExportFlag": "1", 
  "confirmStatus": "0", 
  "valuationMethod": "asdfghjkl", 
  "prn": "1" 
}, 
"importServicesSeller": { 
  "importBusinessName": "lisi", 
  "importEmailAddress": "123456@163.com", 
  "importContactNumber": "15501234567", 
  "importAddress": "beijin", 
  "importInvoiceDate": "2020-09-05",   "importAttachmentName": "test",   "importAttachmentContent": 
"MIIDFjCCAf6gAwIBAgIRAKPGAol9CEdpkIoFa8huM6zfj1WEBRxteoo6PH46un4FGj4N6i oIGzVr9G40uhQGdm16ZU+q44XjW2oUnI9w=" 
 
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
 "mvrn":"", 
 "updateTimes":"0" 
}, 
"agentEntity": { 
  "tin": "1009837013", 
  "legalName": "Mr. STEPHEN BUNJO", 
  "businessName": "CLASSY TRENDS BOUTIQUE", 
  "address": "KITUNZI LUNGUJJA KAMPALA RUBAGA DIVISION NORTH" 
 } 
} 
Flow Description 	Invoice details are queried according to Invoice number. 
Field description 
Field 	Field Name 	Required 	Length 	Description 
invoiceNo 	Invoice number 	Y 	20 	 
 
Seller InformationInternal field: 
Field 	Field Name 	Required 	Length 	Description 
tin 	sellerTIN 	Y 	10-20 	 
ninBrn 	sellerNIN/BRN 	Y 	100 	 
passportNumbe r 	Passport number 	Y 	20 	 
legalName 	Legal Name 	Y 	256 	 
businessName 	Business Name 	Y 	256 	 
adress 	seller Adress 	Y 	500 	 
mobilePhone 	Mobile Phone 	Y 	30 	 
linePhone 	Line Phone 	Y 	30 	 
emailAddress 	Seller email 	Y 	50 	 
placeOfBusine ss 	Place Of 
Business 	N 	500 	 
referenceNo 	referenceNo 	N 	50 	 
branchId 	branchId 	Y 	18 	 
branchName 	branchName 	Y 	500 	 
branchCode 	branchCode 	Y 	50 	 
 
Basic InformationInternal field:   
Field 	Field Name 	Required 	Length 	Description 
invoiceId 	Invoice ID 	Y 	32 	 
invoiceNo 	Invoice number 	Y 	20 	 
oriInvoiceNo 	Original Invoice number 	Y 	20 	 
antifakeCode 	Antifake Code 	Y 	20 	Digital signature(20 digital) 
deviceNo 	device Number 	Y 	20 	Device Number (20 digital) 
issuedDate 	Invoice issued 
Date 	Y 	date 	date(DD/MM/YYYY HH24:mm:ss) stamp 
oriIssuedDate 	Original Invoice issued Date 	Y 	date 	date(DD/MM/YYYY HH24:mm:ss) stamp 
oriGrossAmoun t 	Original invoice amount 	Y 	Number 	 
operator 	Operator 	Y 	150 	 
currency 	currency 	Y 	10 	 
oriInvoiceId 	Original Invoice 
ID 	N 	32 	When the credit is opened, it is the original invoice number. When the ticket is opened, it is empty. 
invoiceType 	Invoice Type 	Y 	1 	1:Invoice/Receipt 
2:Credit Note 
5:Credit Memo 
4:Debit Note 
 Corresponding dictionary table invoiceType 
invoiceKind 	Invoice Kind 	Y 	1 	1 :invoice 2: receipt 
dataSource 	Data Source 	Y 	3 	101:EFD 
				102:Windows Client APP 
103:WebService API 
104:Mis 
105:Webportal 
106:Offline Mode Enabler 
107:USSD 
108:ASK URA 
 Corresponding dictionary table invoiceApplySource 
isInvalid 	Obsolete sign 	N 	1 	Obsolete sign 1: Obsolete 0: Not invalid Note: Obsolete only for negative and 
supplementary tickets 
isRefund 	Is it open to a credit 
note/Debit Note 	N 	1 	Whether it is opened for a ticket / Debit Note: 0 - not issued a negative ticket / Debit 1- is issued Credit 2- is issued Debit 
invoiceIndust ryCode 	invoiceIndustryC ode 	N 	3 	101:General Industry 
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
currencyRate 	currencyRate 	Y 	Number 	 
 
Buyer Details Internal field : 
Field 	Field Name 	Required 	Length 	Description 
buyerTin 	Buyer TIN 	Y 	10-20 	 
buyerNinBrn 	Buyer NIN 	Y 	100 	 
buyerPassport Num 	Passport number 	Y 	20 	 
buyerLegalNam e 	Legal name 	Y 	256 	 
buyerBusiness	Business name 	Y 	256 	 
Name 				
buyerAddress 	Buyer Address 	Y 	500 	 
buyerEmail 	Buyer Email 	Y 	50 	 
buyerMobilePh one 	Buyer Mobile 
Phone 	Y 	30 	 
buyerLinePhon e 	Buyer Line Phone 	Y 	30 	 
buyerPlaceOfB usi 	Buyer Place Of 
Business 	Y 	500 	 
buyerType 	Buyer Type 	Y 	1 	0	: B2B  
1	: B2C 
2	: Foreigner 
3	: B2G 
buyerSector 	Buyer Sector 	N 	200 	 
buyerReferenc eNo 	Buyer ReferenceNo 	N 	50 	EFD and CS do not need to be transmitted, and the external interface is used. 
deliveryTerms Code 	Delivery Terms 	N 	3 	CFR:Cost and Freight 
CIF:Cost Insurance and 
Freight 
CIP:Carriage and Insurance 
Paid To 
CPT:Carriage Paid to 
DAP:Delivered at Place 
DDP:Delivered Duty Paid 
DPU:Delivered at Place 
Unloaded 
EXW:Ex Works 
FAS:Free Alongside Ship 
FCA:Free Carrier 
FOB:Free on Board 
 
Buyer Extend field: 
Field 	Field Name 	Required 	Length 	Description 
propertyType 	Property type 	N 	50 	 
district 	District 	N 	50 	 
municipalityC ounty 	Country or Municipality 	N 	50 	 
divisionSubco unty 	Division or Sub county 	N 	50 	 
town 	town 	N 	 50 	 
cellVillage 	cell or village 	N 	60 	 
effectiveRegi strationDate 	Effective registration  date 	N 	Date 	The time format must be yyyy-
MM-dd 
meterStatus 	Status of the meter (active or in active) 	N 	3 	101:active 
102:in active 
 
Goods DetailsInternal field: 
Field 	Field Name 	Required 	Length 	Description 
item 	item name 	Y 	200 	 
itemCode 	item code 	Y 	50 	 
qty 	Quantity 	Y 	Number 	 
remainQty 	Remain Quantity 	Y 	Number 	 
unitOfMeasure 	unit of measure 	Y 	3 	from T115 rateUnit -->value Required if discountFlag is 1 or 2 
unitPrice 	unit Price 	Y 	Number 	 
total 	Total prise 	Y 	Number 	 
remainAmount 	Remain Total prise 	Y 	Number 	 
taxRate 	tax rate 	Y 	Number 	Save decimals, such as 18% deposit 0.18 
tax 	tax 	Y 	Number 	 
discountTotal 	discount total 	Y 	Number 	 
discountTaxRa te 	discount tax rate 	Y 	Number 	Save decimals, such as 18% deposit 0.18 
orderNumber 	order number 	Y 	Number 	 
discountFlag 	Whether the product line is discounted 	Y 	1 	:discount amount 1:discount good, 2:non-discount good 
The first line cannot be 0 and the last line cannot be 1 
deemedFlag 	Whether deemed 	Y 	1 	1 : deemed  2: not deemed 
exciseFlag 	Whether excise 	Y 	1 	1 : excise  2: not excise 
categoryId 	exciseDutyCode 	Y 	18 	exciseDutyCode 
categoryName 	Excise Duty category name 	Y 	1024 	 
goodsCategory Id 	goods Category id 	Y 	18 	Vat tax commodity classification, currently stored is taxCode 
goodsCategory	goods Category 	N 	200 	 
Name 	Name 			
exciseRate 	Excise tax rate 	N 	21 	 
exciseRule 	Excise 
Calculation 
Rules 	N 	1 	1: Calculated by tax rate 2 Calculated by Quantity 
Corresponding 	dictionary rateType 
exciseTax 	Excise tax 	Y 	Number 	 
pack 	pack 	Y 	Number 	 
stick 	stick 	Y 	Number 	 
exciseUnit 	exciseUnit 	Y 	3 	 
exciseCurrenc y 	exciseCurrency 	Y 	10 	 
exciseRateNam e 	exciseRateName 	Y 	100 	 
vatApplicable Flag 	vatApplicableFla g 	N 	1 	It is not required. The default value is 1. 
deemedExemptC ode 	deemedExemptCode 	N 	3 	101:Deemed 
102:Exempt 
vatProjectId 	vatProjectId 	N 	18 	 
vatProjectNam e 	vatProjectName 	N 	300 	 
totalWeight 	Total Weight 	N 	Number 	totalWeight is required when 
invoice/receipt is export 
hsCode 	HS Code 	N 	50 	 
hsName 	HS Name 	N 	1000 	 
pieceQty 	Piece Quantity 	N 	Number 	 
pieceMeasureU nit 	Piece Measure 
Unit 	N 	3 	This code is from dictionary table, code type is rateUnit 
 
Tax DetailsInternal field: 
Field 	Field Name 	Required 	Length 	Description 
taxCategory 	tax category 	Y 	100 	 
netAmount  	net amount 	Y 	number 	 
taxRate 	tax rate 	Y 	number 	Save decimals, such as 18% deposit 0.18 
taxAmount 	tax 	Y 	number 	 
grossAmount 	gross amount 	Y 	number 	 
exciseUnit 	exciseUnit 	Y 	3 	 
exciseCurrenc y 	exciseCurrency 	Y 	10 	 
taxRateName 	taxRateName 	N 	100 	 
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
 
SummaryInternal field: 
Field 	Field Name 	Required 	Length 	Description 
netAmount 	 net amount  	Y 	 number 	Tax Receipt total net amount  
taxAmount  	 tax amount 	Y 	number 	Tax Receipt total tax amount 
grossAmount 	 gross amount 	Y 	number 	Tax Receipt total gross amount 
oriGrossAmoun t 	original invoice gross amount 	N 	number 	 
itemCount 	Purchase item lines 	Y 	4 	Purchase item lines 
modeCode 	modeCode 	Y 	1 	Issuing receipt mode (1:Online or 0:Offline) ,this code is from dictionary table 
remarks 	Remarks 	Y 	500 	 
qrCode 	qrCode 	Y 	500 	 
 
PayWay field: 
Field 	Field Name 	Required 	Length 	Description 
paymentMode  	paymentMode  	Y 	number 	payWay dictionary table 
101 Credit 102 Cash 
103	Cheque 
104	Demand draft 
105	Mobile money 
106	Visa/Master card 
107	EFT 
108	POS 
109	RTGS 
110	Swift transfer 
paymentAmount
 	 	paymentAmount 	Y 	number 	Tax Receipt total tax amount Must be positive or 0 
The number of integer digits does not exceed 16 digits  
orderNumber 	orderNumber 	Y 	1 	Sort by lowercase letters, such as a, b, c, d, etc. 
 
Extend Internal field: 
Field 	Field Name 	Required 	Length 	Description 
reason 	Cancel reason 	N 	1024 	 
reasonCode 	Refund reason code 	N 	3 	When invoiceType is 4, use the following values: 
 101:Increase in the amount payable/invoice value due to extra products delivered or products delivered charged at an incorrect value. 102:Buyer asked for a new debit note 
103:Others (Please specify) 
 When invoiceType is 5, use the following values: 
 
101:Trade discount 
102:Rebate 
103:Others(Please specify)  When invoiceType is 2, use the following values: 
 
101:Return of products due to expiry or damage, etc. 102:Cancellation of the purchase. 
103:Invoice amount wrongly stated due to miscalculation of price, tax, or discounts, etc. 104:Partial or complete waive off of the product sale after 
				the invoice is generated and sent to customer. 
105:Others (Please specify) 
 Custom field: 
Field 	Field Name 	Required 	Length 	Description 
sadNumber 	SAD Number 	Y 	20 	SAD Number(20 digital) 
office 	office 	Y 	35 	office for example busia 
cif 	cif 	Y 	50 	CIF 
wareHouseNumb er 	Ware housing 
Number 	Y 	16 	 
wareHouseName 	Ware housing 
Name 	Y 	256 	 
destinationCo untry 	destinationCount ry 	Y 	256 	 
originCountry 	originCountry 	Y 	256 	 
importExportF lag 	importExportFlag 	Y 	1 	1 import 2.export 
confirmStatus 	confirmStatus 	Y 	1 	0:Unconfirmed,Taxpayers cannot stock-in; 
1:Confirmed, Taxpayers can stock-in; 
2:Cancelled,Cancellation status and the invoice is 
invalid 
valuationMeth od 	Valuation Method 	Y 	128 	 valuation method 
prn 	prn 	Y 	80 	 
 
ImportServicesSeller field: 
Field 	Field Name 	Required 	Length 	Description 
importBusines sName 	Import BusinessName 	N 	500 	invoiceIndustryCode is equal 
to 104, importbusinessname cannot be empty 
importEmailAd dress 	Import EmailAddress 	N 	50 	 
importContact
Number 	Import ContactNumber 	N 	30 	 
importAddress 	Import Address 	N 	500 	invoiceIndustryCode is equal to 104, importAddress cannot 
be empty 
importInvoice Date 	importInvoiceDat e 	Y 	date 	yyyy-MM-dd 
importAttachm entName 	importAttachment
Name 	  N 	256 	importAttachmentName eg: test.png 
Attachment format: png、doc、 pdf、jpg、txt、docx、xlsx、 cer、crt、der 
importAttachm entContent 	importAttachment
Content 	N 	Unlimit ed 	 
 airlineGoodsDetails field: 
Field 	Field Name 	Required 	Length 	Description 
item 	item name 	Y 	200 	discountFlag is 0, the name 
of the discount line is equal to the name of the discounted 
line + space + "(discount)" When deemedFlag is 1 
Name + space + ”(deemed)” 
If discountFlag is 0 and deemedFlag is 1 
Name + Space + ”(deemed)” + 
Space + ”(discount)” 
itemCode 	item code 	N 	50 	 
qty 	Quantity 	Y 	Number 	Required if discountFlag is 1 or 2 and must be positive must be empty when 
discountFlag is 0 
The number of integer digits does not exceed 12 digits and 
the number of decimal places does not exceed 8 digits 
unitOfMeasure 	unit of measure 	Y 	3 	from T115 rateUnit -->value Required if discountFlag is 1 or 2 
unitPrice 	unit Price 	Y 	Number 	Required if discountFlag is 1 or 2 and must be positive must be empty when 
discountFlag is 0 
The number of integer digits does not exceed 12 digits and the number of decimal places 

				does not exceed 8 digits 
total 	total price 	Y 	Number 	 must be positive when discountFlag is 1 or 2 
must be negative when discountFlag is 0 
No more than 12 digits for integers and no more than 4 digits for decimals 
taxRate 	tax rate 	N 	Number 	For example, the taxRate is 18%  Fill in: 0.18 
For example, the taxRate is zero Fill in: 0 
For example, the taxRate is deemed  Fill in: ‘-’ or ' ' 
 The number of integer digits does not exceed 1 digits and the number of decimal places does not exceed 4 digits 
tax 	tax 	N 	Number 	must be positive when 
discountFlag  is 1 or 2 
must be negative when discountFlag is 0 
The number of integer digits does not exceed 12 digits and 
the number of decimal places does not exceed 4 digits 
discountTotal 	discount total 	N 	Number 	must be empty when 
discountFlag is 0 or 2 
must be negative when discountFlag is 1 And equal to the absolute value of the total of the discount line 
discountTaxRa te 	discount tax rate 	N 	Number 	Save decimals, such as 18% deposit 0.18 
The number of integer digits does not exceed 2 digits and the number of decimal places does not exceed 12 digits 
orderNumber 	order number 	Y 	Number 	Add one each time from zero 

discountFlag 	Whether the product line is discounted 	N 	1 	0:discount amount 1:discount good, 2:non-discount good 
The first line cannot be 0 and the last line cannot be 1 
deemedFlag 	Whether deemed 	N 	1 	1 : deemed 2: not deemed 
exciseFlag 	Whether excise 	N 	1 	1 : excise  2: not excise 
categoryId 	exciseDutyCode 	N 	18 	Excise Duty id 
Required when exciseFlag is 1 
categoryName 	Excise Duty category name 	N 	1024 	Required when exciseFlag is 1 
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
The number of integer digits does not exceed 12 digits and 
				the number of decimal places does not exceed 4 digits 
pack 	pack 	N 	number 	Required when  exciseRule is 2 
Must be positive 
The number of integer digits does not exceed 12 digits and 
the number of decimal places does not exceed 8 digits 
stick 	stick 	N 	number 	Required when exciseRule is 2 
Must be positive 
The number of integer digits does not exceed 12 digits and 
the number of decimal places does not exceed 8 digits 
exciseUnit 	exciseUnit 	N 	3 	101	per stick 
102	per litre 
103	per kg 
104	per user per day of access 
105	per minute 
106	per 1,000sticks 
107	per 50kgs 
108	- 109 per 1 g 
exciseCurrenc y 	exciseCurrency 	N 	10 	Required when exciseRule is 2 from T115 currencyType -
->name 
exciseRateNam e 	exciseRateName 	N 	100 	If exciseRule is 1, the value is (exciseRate * 100) plus the character '%', for example 
exciseRate is 0.18, this value is 18% 
If exciseRule is 2, this value is exciseCurrency + exciseRate + space + 
exciseUnit, for example: UGX650 per litre 
 
EDCDetails field: 
Field 	Field Name 	Required 	Length 	Description 
tankNo 	Tank  no. 	N 	50 	 
pumpNo 	Pump no. 	N 	50 	 
nozzleNo 	Nozzle no. 	 N 	50 	 
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
 
70. Query FDN status 
Interface Name 	Export Invoice Status Query 
Description 	Query Export FDN status 
Interface Code 	T187 
Request Encrypted 	Y 	 
Response Encrypted 	Y 
Request 
Message 	{ 
 "invoiceNo": "1234567891234" } 
Response 
Message 	{ 
 "invoiceNo": "1234567891234", 
 "documentStatusCode": "101" } 
Flow Description 	Query Export FDN status 
Field description 
Field 	Field Name 	Required 	Length 	Description 
invoiceNo 	FDN 	Y 	50 	Invoice Number 
 
 
Field 	Field Name 	Required 	Length 	Description 
invoiceNo 	FDN 	Y 	20 	 
documentStatu sCode 	Document status code 	Y 	3 	101:FDN under processing 
102:Exited 
 
Request/Response code table 
Code 	Name 	description 
TP 	Taxpayer Side 	 
TA 	URA Side 	 
 
 
 
 
