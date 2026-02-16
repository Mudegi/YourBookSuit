/**
 * Mock Excise Duty Codes
 * Temporary fallback data while EFRIS API has backend issues
 * Based on EFRIS documentation examples
 */

export interface MockExciseCode {
  exciseDutyCode: string;
  goodService: string;
  effectiveDate: string;
  parentCode?: string;
  rateText: string;
  isLeafNode: string;
  exciseDutyDetailsList?: Array<{
    exciseDutyId: string;
    rate: string;
    type: string;
  }>;
}

export const MOCK_EXCISE_CODES: MockExciseCode[] = [
  // Alcoholic Beverages
  {
    exciseDutyCode: "LED190100",
    goodService: "Beer and malt beverages",
    effectiveDate: "01/07/2021",
    parentCode: "LED190000",
    rateText: "30% or UGX 1400/liter",
    isLeafNode: "1",
    exciseDutyDetailsList: [
      {
        exciseDutyId: "120453215404593459",
        rate: "0.30",
        type: "101"
      }
    ]
  },
  {
    exciseDutyCode: "LED190200",
    goodService: "Wine",
    effectiveDate: "01/07/2021",
    parentCode: "LED190000",
    rateText: "20% or UGX 7500/liter",
    isLeafNode: "1",
    exciseDutyDetailsList: [
      {
        exciseDutyId: "120453215404593460",
        rate: "0.20",
        type: "101"
      }
    ]
  },
  {
    exciseDutyCode: "LED190300",
    goodService: "Spirits and liquor (over 40% alcohol)",
    effectiveDate: "01/07/2021",
    parentCode: "LED190000",
    rateText: "60% or UGX 2500/liter",
    isLeafNode: "1",
    exciseDutyDetailsList: [
      {
        exciseDutyId: "120453215404593461",
        rate: "0.60",
        type: "101"
      }
    ]
  },
  {
    exciseDutyCode: "LED190400",
    goodService: "Spirits and liquor (under 40% alcohol)",
    effectiveDate: "01/07/2021",
    parentCode: "LED190000",
    rateText: "40% or UGX 1500/liter",
    isLeafNode: "1",
    exciseDutyDetailsList: [
      {
        exciseDutyId: "120453215404593462",
        rate: "0.40",
        type: "101"
      }
    ]
  },
  {
    exciseDutyCode: "LED190500",
    goodService: "Cider and perry",
    effectiveDate: "01/07/2021",
    parentCode: "LED190000",
    rateText: "20%",
    isLeafNode: "1",
    exciseDutyDetailsList: [
      {
        exciseDutyId: "120453215404593463",
        rate: "0.20",
        type: "101"
      }
    ]
  },

  // Non-Alcoholic Beverages
  {
    exciseDutyCode: "LED190600",
    goodService: "Soft drinks and carbonated beverages",
    effectiveDate: "01/07/2021",
    parentCode: "LED190000",
    rateText: "13% or UGX 250/liter",
    isLeafNode: "1",
    exciseDutyDetailsList: [
      {
        exciseDutyId: "120453215404593464",
        rate: "0.13",
        type: "101"
      }
    ]
  },
  {
    exciseDutyCode: "LED190700",
    goodService: "Bottled water",
    effectiveDate: "01/07/2021",
    parentCode: "LED190000",
    rateText: "UGX 200/liter",
    isLeafNode: "1",
    exciseDutyDetailsList: [
      {
        exciseDutyId: "120453215404593465",
        rate: "200",
        type: "102"
      }
    ]
  },
  {
    exciseDutyCode: "LED190800",
    goodService: "Energy drinks",
    effectiveDate: "01/07/2021",
    parentCode: "LED190000",
    rateText: "20% or UGX 500/liter",
    isLeafNode: "1",
    exciseDutyDetailsList: [
      {
        exciseDutyId: "120453215404593466",
        rate: "0.20",
        type: "101"
      }
    ]
  },
  {
    exciseDutyCode: "LED190900",
    goodService: "Juices with sugar content over 15g/100ml",
    effectiveDate: "01/07/2021",
    parentCode: "LED190000",
    rateText: "13%",
    isLeafNode: "1",
    exciseDutyDetailsList: [
      {
        exciseDutyId: "120453215404593467",
        rate: "0.13",
        type: "101"
      }
    ]
  },

  // Tobacco Products
  {
    exciseDutyCode: "LED200100",
    goodService: "Cigarettes",
    effectiveDate: "01/07/2021",
    parentCode: "LED200000",
    rateText: "UGX 60,000 per 1000 sticks + 20%",
    isLeafNode: "1",
    exciseDutyDetailsList: [
      {
        exciseDutyId: "120453215404593468",
        rate: "60000",
        type: "102"
      }
    ]
  },
  {
    exciseDutyCode: "LED200200",
    goodService: "Cigars and cigarillos",
    effectiveDate: "01/07/2021",
    parentCode: "LED200000",
    rateText: "UGX 100,000 per kg",
    isLeafNode: "1",
    exciseDutyDetailsList: [
      {
        exciseDutyId: "120453215404593469",
        rate: "100000",
        type: "102"
      }
    ]
  },
  {
    exciseDutyCode: "LED200300",
    goodService: "Other manufactured tobacco",
    effectiveDate: "01/07/2021",
    parentCode: "LED200000",
    rateText: "UGX 50,000 per kg",
    isLeafNode: "1",
    exciseDutyDetailsList: [
      {
        exciseDutyId: "120453215404593470",
        rate: "50000",
        type: "102"
      }
    ]
  },

  // Petroleum Products
  {
    exciseDutyCode: "LED300100",
    goodService: "Petrol (gasoline)",
    effectiveDate: "01/07/2021",
    parentCode: "LED300000",
    rateText: "UGX 1,450 per liter",
    isLeafNode: "1",
    exciseDutyDetailsList: [
      {
        exciseDutyId: "120453215404593471",
        rate: "1450",
        type: "102"
      }
    ]
  },
  {
    exciseDutyCode: "LED300200",
    goodService: "Diesel",
    effectiveDate: "01/07/2021",
    parentCode: "LED300000",
    rateText: "UGX 1,050 per liter",
    isLeafNode: "1",
    exciseDutyDetailsList: [
      {
        exciseDutyId: "120453215404593472",
        rate: "1050",
        type: "102"
      }
    ]
  },
  {
    exciseDutyCode: "LED300300",
    goodService: "Kerosene",
    effectiveDate: "01/07/2021",
    parentCode: "LED300000",
    rateText: "UGX 0 per liter (exempt)",
    isLeafNode: "1",
    exciseDutyDetailsList: [
      {
        exciseDutyId: "120453215404593473",
        rate: "0",
        type: "102"
      }
    ]
  },
  {
    exciseDutyCode: "LED300400",
    goodService: "Heavy fuel oil",
    effectiveDate: "01/07/2021",
    parentCode: "LED300000",
    rateText: "UGX 300 per liter",
    isLeafNode: "1",
    exciseDutyDetailsList: [
      {
        exciseDutyId: "120453215404593474",
        rate: "300",
        type: "102"
      }
    ]
  },

  // Telecommunications
  {
    exciseDutyCode: "LED400100",
    goodService: "Airtime and mobile money services",
    effectiveDate: "01/07/2021",
    parentCode: "LED400000",
    rateText: "12% on value",
    isLeafNode: "1",
    exciseDutyDetailsList: [
      {
        exciseDutyId: "120453215404593475",
        rate: "0.12",
        type: "101"
      }
    ]
  },
  {
    exciseDutyCode: "LED400200",
    goodService: "Internet data services",
    effectiveDate: "01/07/2021",
    parentCode: "LED400000",
    rateText: "12% on value",
    isLeafNode: "1",
    exciseDutyDetailsList: [
      {
        exciseDutyId: "120453215404593476",
        rate: "0.12",
        type: "101"
      }
    ]
  },

  // Cosmetics and Personal Care
  {
    exciseDutyCode: "LED500100",
    goodService: "Perfumes and toilet waters",
    effectiveDate: "01/07/2021",
    parentCode: "LED500000",
    rateText: "10%",
    isLeafNode: "1",
    exciseDutyDetailsList: [
      {
        exciseDutyId: "120453215404593477",
        rate: "0.10",
        type: "101"
      }
    ]
  },
  {
    exciseDutyCode: "LED500200",
    goodService: "Personal care and beauty products",
    effectiveDate: "01/07/2021",
    parentCode: "LED500000",
    rateText: "10%",
    isLeafNode: "1",
    exciseDutyDetailsList: [
      {
        exciseDutyId: "120453215404593478",
        rate: "0.10",
        type: "101"
      }
    ]
  },

  // Vehicles
  {
    exciseDutyCode: "LED600100",
    goodService: "Passenger vehicles under 1500cc",
    effectiveDate: "01/07/2021",
    parentCode: "LED600000",
    rateText: "10% on CIF value",
    isLeafNode: "1",
    exciseDutyDetailsList: [
      {
        exciseDutyId: "120453215404593479",
        rate: "0.10",
        type: "101"
      }
    ]
  },
  {
    exciseDutyCode: "LED600200",
    goodService: "Passenger vehicles 1500cc - 3000cc",
    effectiveDate: "01/07/2021",
    parentCode: "LED600000",
    rateText: "20% on CIF value",
    isLeafNode: "1",
    exciseDutyDetailsList: [
      {
        exciseDutyId: "120453215404593480",
        rate: "0.20",
        type: "101"
      }
    ]
  },
  {
    exciseDutyCode: "LED600300",
    goodService: "Passenger vehicles over 3000cc",
    effectiveDate: "01/07/2021",
    parentCode: "LED600000",
    rateText: "25% on CIF value",
    isLeafNode: "1",
    exciseDutyDetailsList: [
      {
        exciseDutyId: "120453215404593481",
        rate: "0.25",
        type: "101"
      }
    ]
  },

  // Parent/Category Codes
  {
    exciseDutyCode: "LED190000",
    goodService: "Beverages (Category)",
    effectiveDate: "01/07/2021",
    parentCode: "LED000000",
    rateText: "Various",
    isLeafNode: "0"
  },
  {
    exciseDutyCode: "LED200000",
    goodService: "Tobacco Products (Category)",
    effectiveDate: "01/07/2021",
    parentCode: "LED000000",
    rateText: "Various",
    isLeafNode: "0"
  },
  {
    exciseDutyCode: "LED300000",
    goodService: "Petroleum Products (Category)",
    effectiveDate: "01/07/2021",
    parentCode: "LED000000",
    rateText: "Various",
    isLeafNode: "0"
  },
  {
    exciseDutyCode: "LED400000",
    goodService: "Telecommunications (Category)",
    effectiveDate: "01/07/2021",
    parentCode: "LED000000",
    rateText: "Various",
    isLeafNode: "0"
  },
  {
    exciseDutyCode: "LED500000",
    goodService: "Cosmetics and Personal Care (Category)",
    effectiveDate: "01/07/2021",
    parentCode: "LED000000",
    rateText: "Various",
    isLeafNode: "0"
  },
  {
    exciseDutyCode: "LED600000",
    goodService: "Motor Vehicles (Category)",
    effectiveDate: "01/07/2021",
    parentCode: "LED000000",
    rateText: "Various",
    isLeafNode: "0"
  }
];
