import IconifyIcon from '@larkon/components/wrappers/IconifyIcon'
import { currency } from '@larkon/context/constants'
import { getProductData } from '@larkon/helpers/data'
import { ProductType } from '@larkon/types/data'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'
import { Card, CardFooter, CardHeader, CardTitle, Dropdown, DropdownMenu, DropdownToggle } from 'react-bootstrap'

const ProductCard = ({ title, price, category, image, rating, size, stockLeft, stockSold }: ProductType) => {
  return (
    <tr>
      <td>
        <div className="form-check ms-1">
          <input type="checkbox" className="form-check-input" id="customCheck2" />
          <label className="form-check-label" htmlFor="customCheck2">
            &nbsp;
          </label>
        </div>
      </td>
      <td>
        <div className="d-flex align-items-center gap-2">
          <div className="rounded bg-light avatar-md d-flex align-items-center justify-content-center">
            <Image src={image} alt="product" className="avatar-md" />
          </div>
          <div>
            <Link href="" className="text-dark fw-medium fs-15">
              {title}
            </Link>
            <p className="text-muted mb-0 mt-1 fs-13">
              <span>Size : </span>
              {size}
            </p>
          </div>
        </div>
      </td>
      <td>
        {currency}
        {price}.00
      </td>
      <td>
        <p className="mb-1 text-muted">
          <span className="text-dark fw-medium">{stockLeft} Item</span> Left
        </p>
        <p className="mb-0 text-muted">{stockSold} Sold</p>
      </td>
      <td>{category}</td>
      <td>
        {' '}
        <span className="badge p-1 bg-light text-dark fs-12 me-1">
          <IconifyIcon icon="bxs:star" className="align-text-top fs-14 text-warning me-1" />
          {rating.star}
        </span>{' '}
        {rating.review} Review
      </td>
      <td>
        <div className="d-flex gap-2">
          <Link href="" className="btn btn-light btn-sm">
            <IconifyIcon icon="solar:eye-broken" className="align-middle fs-18" />
          </Link>
          <Link href="" className="btn btn-soft-primary btn-sm">
            <IconifyIcon icon="solar:pen-2-broken" className="align-middle fs-18" />
          </Link>
          <Link href="" className="btn btn-soft-danger btn-sm">
            <IconifyIcon icon="solar:trash-bin-minimalistic-2-broken" className="align-middle fs-18" />
          </Link>
        </div>
      </td>
    </tr>
  )
}

const ProductList = async () => {
  const productData = await getProductData()

  return (
    <Card>
      <CardHeader className="d-flex justify-content-between align-items-center gap-1">
        <CardTitle as={'h4'} className="flex-grow-1">
          All Product List
        </CardTitle>
        <Link href="/products/product-add" className="btn btn-sm btn-primary">
          Add Product
        </Link>
        <Dropdown>
          <DropdownToggle as={'a'} href="#" className="btn btn-sm btn-outline-light content-none" data-bs-toggle="dropdown" aria-expanded="false">
            This Month
            <IconifyIcon width={16} height={16} className="ms-1" icon="bx:chevron-down" />
          </DropdownToggle>
          <DropdownMenu className="dropdown-menu-end">
            <Link href="" className="dropdown-item">
              Download
            </Link>
            <Link href="" className="dropdown-item">
              Export
            </Link>
            <Link href="" className="dropdown-item">
              Import
            </Link>
          </DropdownMenu>
        </Dropdown>
      </CardHeader>
      <div>
        <div className="table-responsive">
          <table className="table align-middle mb-0 table-hover table-centered">
            <thead className="bg-light-subtle">
              <tr>
                <th style={{ width: 20 }}>
                  <div className="form-check ms-1">
                    <input type="checkbox" className="form-check-input" id="customCheck1" />
                    <label className="form-check-label" htmlFor="customCheck1" />
                  </div>
                </th>
                <th>Product Name &amp; Size</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Category</th>
                <th>Rating</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {productData.map((item, idx) => (
                <ProductCard key={idx} {...item} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <CardFooter className="border-top">
        <nav aria-label="Page navigation example">
          <ul className="pagination justify-content-end mb-0">
            <li className="page-item">
              <Link className="page-link" href="">
                Previous
              </Link>
            </li>
            <li className="page-item active">
              <Link className="page-link" href="">
                1
              </Link>
            </li>
            <li className="page-item">
              <Link className="page-link" href="">
                2
              </Link>
            </li>
            <li className="page-item">
              <Link className="page-link" href="">
                3
              </Link>
            </li>
            <li className="page-item">
              <Link className="page-link" href="">
                Next
              </Link>
            </li>
          </ul>
        </nav>
      </CardFooter>
    </Card>
  )
}

export default ProductList
