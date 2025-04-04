import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export function SizeGuide() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">T-Shirt Size Guide</h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Size</TableHead>
            <TableHead>Chest (cm)</TableHead>
            <TableHead>Length (cm)</TableHead>
            <TableHead>Sleeve (cm)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>XS</TableCell>
            <TableCell>86-91</TableCell>
            <TableCell>66-69</TableCell>
            <TableCell>19</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>S</TableCell>
            <TableCell>96-101</TableCell>
            <TableCell>71-74</TableCell>
            <TableCell>20</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>M</TableCell>
            <TableCell>101-106</TableCell>
            <TableCell>74-76</TableCell>
            <TableCell>21</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>L</TableCell>
            <TableCell>106-111</TableCell>
            <TableCell>76-79</TableCell>
            <TableCell>22</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>XL</TableCell>
            <TableCell>111-116</TableCell>
            <TableCell>79-81</TableCell>
            <TableCell>23</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>XXL</TableCell>
            <TableCell>116-121</TableCell>
            <TableCell>81-84</TableCell>
            <TableCell>24</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  )
}

